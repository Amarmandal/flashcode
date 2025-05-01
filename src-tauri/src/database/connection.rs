use refinery::embed_migrations;
use rusqlite::{Connection, Error, Result};
use std::fs;
use tauri::{AppHandle, Manager};

embed_migrations!("migrations");

pub struct DatabaseConnection {
    conn: Connection,
}

impl DatabaseConnection {
    pub fn new(app_handle: &AppHandle) -> Result<Self, Error> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");

        // Create the directory if it doesn't exist
        if !app_data_dir.exists() {
            fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
        }

        // Set database path
        let db_path = app_data_dir.join("flashcodes.db");

        match Connection::open(&db_path) {
            Ok(conn) => {
                let mut db = Self { conn };
                db.initialize_db()?;
                Ok(db)
            }
            Err(e) => {
                eprintln!("Failed to open database connection at {:?}: {}", db_path, e);
                Err(e)
            }
        }
    }

    pub fn get_connection(&self) -> &Connection {
        &self.conn
    }

    fn initialize_db(&mut self) -> Result<(), Error> {
        // Enable foreign key constraints
        self.conn.execute("PRAGMA foreign_keys = ON;", [])?;

        // Run migrations
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
