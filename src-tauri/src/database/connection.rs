use rusqlite::{Connection, Error, Result};
use std::fs;
use tauri::{AppHandle, Manager};

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
        let tx = self.conn.transaction()?;

        tx.execute("PRAGMA foreign_keys = ON;", [])?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS decks (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                name TEXT NOT NULL, 
                is_favorite BOOLEAN NOT NULL DEFAULT 0, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS flashcodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                deck_id INTEGER NOT NULL,
                language TEXT NOT NULL DEFAULT 'rust',  
                ease_factor REAL NOT NULL DEFAULT 2.5,
                repetitions INTEGER NOT NULL DEFAULT 0,
                interval INTEGER NOT NULL DEFAULT 1,
                due_date INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
            )",
            [],
        )?;

        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_flashcodes_deck_id ON flashcodes(deck_id)",
            [],
        )?;

        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_decks_name ON decks(name)",
            [],
        )?;

        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_decks_created_at ON decks (created_at)",
            [],
        )?;

        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_flashcodes_created_at ON flashcodes (created_at)",
            [],
        )?;

        tx.commit()
    }

    #[allow(dead_code)]
    pub fn reset_database(&mut self) -> Result<(), Error> {
        // Drop the tables if they exist
        self.conn.execute("DROP TABLE IF EXISTS flashcodes", [])?;
        self.conn.execute("DROP TABLE IF EXISTS decks", [])?;
        self.conn.execute("DROP TABLE IF EXISTS migrations", [])?;

        self.initialize_db()?;
        Ok(())
    }
}
