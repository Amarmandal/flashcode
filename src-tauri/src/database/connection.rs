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

        let db_path = app_data_dir.join("flashcodes.db");
        let conn = Connection::open(&db_path)?;

        let mut db = Self {
            conn,
            app_data_dir,
            current_user_id: None,
        };
        db.initialize_db()?;
        Ok(db)
    }

    pub fn get_connection(&self) -> &Connection {
        &self.conn
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
        let default_path = self.app_data_dir.join("flashcodes.db");
        self.conn = Connection::open_in_memory()?;

        let mut new_conn = Connection::open(&default_path)?;
        new_conn.execute("PRAGMA foreign_keys = ON;", [])?;
        let _ = migrations::runner().run(&mut new_conn);

        self.conn = new_conn;
        self.current_user_id = None;
        println!("Reverted to default database");
        Ok(())
    }

    pub fn backup_to_bytes(&self) -> Result<Vec<u8>, Error> {
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
        let temp_dir = std::env::temp_dir();
        let timestamp_num = chrono::Local::now().timestamp_nanos_opt().unwrap_or_default();
        let temp_file = temp_dir.join(format!("flashcode_restore_temp_{}.db", timestamp_num));

        fs::write(&temp_file, bytes).map_err(|_| Error::InvalidPath(temp_file.clone()))?;

        // Validate source is a healthy SQLite database
        {
            let temp_conn = Connection::open(&temp_file)?;
            let mut stmt = temp_conn.prepare("PRAGMA integrity_check;")?;
            let mut rows = stmt.query([])?;
            if let Some(row) = rows.next()? {
                let status: String = row.get(0)?;
                if status != "ok" {
                    let _ = fs::remove_file(&temp_file);
                    return Err(Error::InvalidParameterName(format!(
                        "Database integrity check failed: {}",
                        status
                    )));
                }
            }
        }

        let target_db_path = self.get_active_db_path();

        // Perform safety copy under lock
        let time_str = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let safety_path = self.app_data_dir.join(format!(
            "safety_backup_{}_{}.db",
            self.current_user_id.as_deref().unwrap_or("default"),
            time_str
        ));

        if target_db_path.exists() {
            let _ = fs::copy(&target_db_path, &safety_path);
        }

        // Release file handle by pointing to in-memory connection
        self.conn = Connection::open_in_memory()?;

        // Replace file
        if let Err(e) = fs::copy(&temp_file, &target_db_path) {
            eprintln!("Failed to copy restored database: {:?}", e);
            let _ = fs::remove_file(&temp_file);
            if safety_path.exists() {
                let _ = fs::copy(&safety_path, &target_db_path);
            }
            // Re-open
            self.conn = Connection::open(&target_db_path)?;
            return Err(Error::InvalidPath(target_db_path));
        }

        let _ = fs::remove_file(&temp_file);

        // Reopen fresh connection and run migrations
        let mut new_conn = Connection::open(&target_db_path)?;
        new_conn.execute("PRAGMA foreign_keys = ON;", [])?;
        let _ = migrations::runner().run(&mut new_conn);
        self.conn = new_conn;

        Ok(safety_path.to_string_lossy().to_string())
    }

    fn initialize_db(&mut self) -> Result<(), Error> {
        self.conn.execute("PRAGMA foreign_keys = ON;", [])?;

        match migrations::runner().run(&mut self.conn) {
            Ok(_) => {
                println!("Successfully ran database migrations");
                Ok(())
            }
            Err(e) => {
                eprintln!("Error running database migrations: {}", e);
                Err(Error::InvalidParameterName(format!(
                    "Migration error: {}",
                    e
                )))
            }
        }
    }
}
