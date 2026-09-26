use refinery::embed_migrations;
use rusqlite::{Connection, Error, Result};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

embed_migrations!("migrations");

pub struct DatabaseConnection {
    conn: Connection,
    app_data_dir: PathBuf,
    current_user_id: Option<String>,
    recovery_failed: bool,
}

impl DatabaseConnection {
    pub fn new(app_handle: &AppHandle) -> Result<Self, Error> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");

        if !app_data_dir.exists() {
            fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
        }

        crate::oauth::set_app_data_dir(app_data_dir.clone());

        let conn = Connection::open_in_memory()?;

        Ok(Self {
            conn,
            app_data_dir,
            current_user_id: None,
            recovery_failed: false,
        })
    }

    pub fn get_connection(&self) -> &Connection {
        &self.conn
    }

    pub fn is_recovery_failed(&self) -> bool {
        self.recovery_failed
    }

    pub fn get_active_db_path(&self) -> PathBuf {
        match &self.current_user_id {
            Some(uid) => {
                let sanitized: String = uid
                    .chars()
                    .map(|c| if c.is_alphanumeric() { c } else { '_' })
                    .collect();
                self.app_data_dir.join(format!("flashcodes_user_{}.db", sanitized))
            }
            None => self.app_data_dir.join("flashcodes.db"),
        }
    }

    pub fn current_user_id(&self) -> Option<&str> {
        self.current_user_id.as_deref()
    }

    pub fn switch_user(&mut self, user_id: &str) -> Result<(), Error> {
        if self.recovery_failed {
            return Err(Error::InvalidParameterName(
                "Database operations are blocked due to a previous unrecovered restore failure".to_string(),
            ));
        }

        let sanitized: String = user_id
            .chars()
            .map(|c| if c.is_alphanumeric() { c } else { '_' })
            .collect();
        let target_path = self.app_data_dir.join(format!("flashcodes_user_{}.db", sanitized));

        // Prepare the new connection fully before touching the existing one.
        // If any step fails, the current connection remains untouched.
        let mut new_conn = Connection::open(&target_path)?;
        new_conn.execute("PRAGMA foreign_keys = ON;", [])?;
        migrations::runner().run(&mut new_conn).map_err(|e| {
            Error::InvalidParameterName(format!("Migration error for user database: {}", e))
        })?;

        // Only after full success, replace the active connection.
        self.conn = new_conn;
        self.current_user_id = Some(user_id.to_string());
        Ok(())
    }

    pub fn close_user(&mut self) -> Result<(), Error> {
        self.conn = Connection::open_in_memory()?;
        self.current_user_id = None;
        Ok(())
    }

    pub fn backup_to_bytes(&self) -> Result<Vec<u8>, Error> {
        if self.recovery_failed {
            return Err(Error::InvalidParameterName(
                "Database operations are blocked due to a previous unrecovered restore failure".to_string(),
            ));
        }

        let temp_dir = std::env::temp_dir();
        let timestamp = chrono::Local::now().timestamp_nanos_opt().unwrap_or_default();
        let temp_snapshot_file = temp_dir.join(format!("flashcode_backup_snap_{}.db", timestamp));

        // Use SQLite Online Backup API for a consistent transaction-safe snapshot
        {
            let mut dest_conn = Connection::open(&temp_snapshot_file)?;
            let backup = rusqlite::backup::Backup::new(&self.conn, &mut dest_conn)?;
            backup.run_to_completion(5, std::time::Duration::from_millis(10), None)?;
        }

        let bytes = fs::read(&temp_snapshot_file).map_err(|e| {
            eprintln!("Failed to read backup snapshot bytes: {:?}", e);
            Error::InvalidPath(temp_snapshot_file.clone())
        })?;

        let _ = fs::remove_file(&temp_snapshot_file);
        Ok(bytes)
    }

    pub fn restore_from_bytes(&mut self, bytes: &[u8]) -> Result<String, Error> {
        if self.recovery_failed {
            return Err(Error::InvalidParameterName(
                "Database operations are blocked due to a previous unrecovered restore failure".to_string(),
            ));
        }

        // 1. Prepare the candidate before touching live data.
        // Validate SQLite magic header (100-byte minimum file size, "SQLite format 3\0")
        // so an empty or non-SQLite file is never treated as a blank new database.
        if bytes.len() < 100 || &bytes[0..16] != b"SQLite format 3\0" {
            return Err(Error::InvalidParameterName(
                "Invalid SQLite backup: missing or corrupted SQLite header".to_string(),
            ));
        }

        let temp_dir = std::env::temp_dir();
        let timestamp_num = chrono::Local::now().timestamp_nanos_opt().unwrap_or_default();
        let temp_file = temp_dir.join(format!("flashcode_restore_temp_{}.db", timestamp_num));

        fs::write(&temp_file, bytes).map_err(|e| {
            Error::InvalidParameterName(format!("Failed to write temporary restore file: {}", e))
        })?;

        // Validate candidate via PRAGMA integrity_check AND run migrations against the candidate
        let candidate_prep: Result<(), Error> = (|| {
            let mut temp_conn = Connection::open(&temp_file)?;
            {
                let mut stmt = temp_conn.prepare("PRAGMA integrity_check;")?;
                let mut rows = stmt.query([])?;
                let mut has_row = false;
                while let Some(row) = rows.next()? {
                    has_row = true;
                    let status: String = row.get(0)?;
                    if status.to_lowercase() != "ok" {
                        return Err(Error::InvalidParameterName(format!(
                            "Database integrity check failed: {}",
                            status
                        )));
                    }
                }
                if !has_row {
                    return Err(Error::InvalidParameterName(
                        "Database integrity check returned no status".to_string(),
                    ));
                }
            }

            temp_conn.execute("PRAGMA foreign_keys = ON;", [])?;

            migrations::runner().run(&mut temp_conn).map_err(|e| {
                Error::InvalidParameterName(format!(
                    "Candidate database migration failed: {}",
                    e
                ))
            })?;

            Ok(())
        })();

        if let Err(e) = candidate_prep {
            let _ = fs::remove_file(&temp_file);
            return Err(e);
        }

        // 2. Require a successful safety backup using SQLite Online Backup API.
        let target_db_path = self.get_active_db_path();
        let time_str = chrono::Local::now().format("%Y%m%d_%H%M%S_%f");
        let safety_path = self.app_data_dir.join(format!(
            "safety_backup_{}_{}.db",
            self.current_user_id.as_deref().unwrap_or("default"),
            time_str
        ));

        let safety_backup_res: Result<(), Error> = (|| {
            let mut safety_conn = Connection::open(&safety_path)?;
            {
                let backup = rusqlite::backup::Backup::new(&self.conn, &mut safety_conn)?;
                backup.run_to_completion(5, std::time::Duration::from_millis(10), None)?;
            }
            safety_conn.execute("PRAGMA synchronous = FULL;", [])?;
            Ok(())
        })();

        if let Err(e) = safety_backup_res {
            let _ = fs::remove_file(&temp_file);
            let _ = fs::remove_file(&safety_path);
            return Err(Error::InvalidParameterName(format!(
                "Failed to create safety backup before restore: {}",
                e
            )));
        }

        match fs::metadata(&safety_path) {
            Ok(meta) if meta.len() >= 100 => {}
            _ => {
                let _ = fs::remove_file(&temp_file);
                let _ = fs::remove_file(&safety_path);
                return Err(Error::InvalidParameterName(
                    "Safety backup file could not be verified; aborting restore".to_string(),
                ));
            }
        }

        // 3. Replace safely and recover on failure.
        // Close the active connection before replacement by pointing to an in-memory DB.
        self.conn = Connection::open_in_memory()?;

        let replace_and_open: Result<Connection, Error> = (|| {
            fs::copy(&temp_file, &target_db_path).map_err(|e| {
                Error::InvalidParameterName(format!(
                    "Failed to copy prepared candidate to target database: {}",
                    e
                ))
            })?;

            let mut new_conn = Connection::open(&target_db_path)?;
            new_conn.execute("PRAGMA foreign_keys = ON;", [])?;
            migrations::runner().run(&mut new_conn).map_err(|e| {
                Error::InvalidParameterName(format!(
                    "Migration failed on restored database: {}",
                    e
                ))
            })?;

            Ok(new_conn)
        })();

        let _ = fs::remove_file(&temp_file);

        match replace_and_open {
            Ok(new_conn) => {
                self.conn = new_conn;
                self.recovery_failed = false;
                Ok(safety_path.to_string_lossy().to_string())
            }
            Err(replace_err) => {
                eprintln!(
                    "Restore replacement failed ({}); restoring safety snapshot...",
                    replace_err
                );

                // Attempt to restore the safety snapshot and reopen original database
                let recovery_res: Result<Connection, Error> = (|| {
                    fs::copy(&safety_path, &target_db_path).map_err(|e| {
                        Error::InvalidParameterName(format!(
                            "Failed to restore safety snapshot file: {}",
                            e
                        ))
                    })?;

                    let mut recovered_conn = Connection::open(&target_db_path)?;
                    recovered_conn.execute("PRAGMA foreign_keys = ON;", [])?;
                    migrations::runner().run(&mut recovered_conn).map_err(|e| {
                        Error::InvalidParameterName(format!(
                            "Migration failed while recovering original database: {}",
                            e
                        ))
                    })?;

                    Ok(recovered_conn)
                })();

                match recovery_res {
                    Ok(recovered_conn) => {
                        self.conn = recovered_conn;
                        Err(replace_err)
                    }
                    Err(recovery_err) => {
                        // Recovery also failed: block all database operations and preserve safety_path
                        eprintln!(
                            "CRITICAL: Recovery from safety backup failed ({}). Safety backup preserved at {:?}",
                            recovery_err, safety_path
                        );
                        self.recovery_failed = true;
                        self.current_user_id = None;
                        Err(Error::InvalidParameterName(format!(
                            "Database restore failed ({}) and recovery also failed ({}). Safety backup preserved at {:?}",
                            replace_err, recovery_err, safety_path
                        )))
                    }
                }
            }
        }
    }
}
