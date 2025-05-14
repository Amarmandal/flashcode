use std::time::SystemTime;
use chrono::{Utc, DateTime};

use rusqlite::{params, Error};
use serde::{Deserialize, Serialize};

use crate::{database::DatabaseConnection, sm2::{calculate_sm2, Answer}};

#[derive(Debug, Serialize, Deserialize)]
pub struct Flashcode {
    pub id: i64,
    pub front: String,
    pub back: String,
    pub deck_id: i64,
    pub language: String,
    pub ease_factor: f32,
    pub repetitions: u32,
    pub interval: u32,
    pub created_at: String,
    pub due_date: u64,
}

impl Flashcode {
    pub fn default() -> Self {
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("Time went backwards");

        let due_date = seconds_to_days(now.as_secs());
        let now_iso: DateTime<Utc> = Utc::now();
        let created_at = now_iso.to_rfc3339(); // ISO 8601 format

        Flashcode {
            id: -1,
            front: String::new(),
            back: String::new(),
            deck_id: -1,
            language: String::new(),
            ease_factor: 2.5,
            repetitions: 0,
            interval: 1,
            created_at,
            due_date,
        }
    }

    pub fn create(
        db: &DatabaseConnection,
        front: &str,
        back: &str,
        deck_id: i64,
        language: &str,
    ) -> Result<Self, Error> {
        let conn = db.get_connection();
        let new_flashcode = Flashcode {
            id: conn.last_insert_rowid(),
            front: front.to_string(),
            back: back.to_string(),
            deck_id,
            language: language.to_string(),
            ..Flashcode::default()
        };

        conn.execute(
            "INSERT INTO flashcodes (front, back, deck_id, language, ease_factor, repetitions, interval, created_at, due_date) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                new_flashcode.front,
                new_flashcode.back,
                new_flashcode.deck_id,
                new_flashcode.language,
                new_flashcode.ease_factor,
                new_flashcode.repetitions,
                new_flashcode.interval,
                new_flashcode.created_at, 
                new_flashcode.due_date,
            ],
        )?;

        Ok(new_flashcode)
    }

    pub fn get(db: &DatabaseConnection, id: i64) -> Result<Self, Error> {
        let conn = db.get_connection();
        conn.query_row(
            "SELECT id, front, back, deck_id, language, ease_factor, repetitions, interval, created_at, due_date FROM flashcodes WHERE id = ?1",
            params![id],
            |row| {
                Ok(Flashcode {
                    id: row.get("id")?,
                    front: row.get("front")?,
                    back: row.get("back")?,
                    deck_id: row.get("deck_id")?,
                    language: row.get("language")?,
                    ease_factor: row.get("ease_factor")?,
                    repetitions: row.get("repetitions")?,            // Default value
                    interval: row.get("interval")?,               // Default value
                    created_at: row.get("created_at")?, // Placeholder value
                    due_date: row.get("due_date")?, // Placeholder value
                })
            },
        )
    }

    pub fn get_by_deck_id(db: &DatabaseConnection, deck_id: i64) -> Result<Vec<Self>, Error> {
        let conn = db.get_connection();

        let mut stmt = conn.prepare(
            "SELECT id, front, back, deck_id, language, ease_factor, repetitions, interval, created_at, due_date FROM flashcodes WHERE deck_id = ?1",
        )?;

        let flashcodes = stmt.query_map(params![deck_id], |row| {
            Ok(Flashcode {
                id: row.get("id")?,
                front: row.get("front")?,
                back: row.get("back")?,
                deck_id: row.get("deck_id")?,
                language: row.get("language")?,
                ease_factor: row.get("ease_factor")?,
                repetitions: row.get("repetitions")?,
                interval: row.get("interval")?,
                created_at: row.get("created_at")?,
                due_date: row.get("due_date")?,
            })
        })?;

        let mut results: Vec<Flashcode> = Vec::new();

        for item in flashcodes {
            results.push(item?);
        }

        Ok(results)
    }

    pub fn get_all_queues_cards(
        db: &DatabaseConnection,
        deck_id: i64,
    ) -> Result<(Vec<Flashcode>, usize, usize, usize), rusqlite::Error> {
        // Step 1: Retrieve all cards from the database filtered by deck_id
        let cards = Flashcode::get_by_deck_id(db, deck_id)?;
        
        // Step 2: Build queues using the queue_builder method
        let queues = crate::build_queues(cards);
        
        let (new_count, learning_count, review_count) = queues.counts();
        
        // Step 3: Merge the queues
        let merged_cards = crate::merge_queues(queues);

        // Step 5: Return the merged cards and counts
        Ok((merged_cards, new_count, learning_count, review_count))
    }

    pub fn update(&self, db: &DatabaseConnection) -> Result<String, Error> {
        let conn = db.get_connection();

        conn.execute(
            "UPDATE flashcodes SET front = ?1, back = ?2, language = ?3 WHERE id = ?4",
            params![&self.front, &self.back, &self.language, &self.id],
        )?;

        Ok("Flashcode has been updated successfully".to_string())
    }

    pub fn update_based_on_answer(db: &DatabaseConnection, id: &str,  answer: Answer) -> Result<String, Error> {
        let conn = db.get_connection();

        let flashcode = conn.query_row(
            "SELECT id, ease_factor, repetitions, interval, due_date FROM flashcodes WHERE id = ?1",
            params![id],
            |row| {
                Ok(Flashcode {
                    id: row.get("id")?,
                    ease_factor: row.get("ease_factor")?,
                    repetitions: row.get("repetitions")?,
                    interval: row.get("interval")?,
                    due_date: row.get("due_date")?,
                    ..Flashcode::default()
                })
            },
        );

        match flashcode {
            Ok(flashcode) => {
                let previous_interval = flashcode.interval;
                let previous_ease_factor = flashcode.ease_factor;
                let previous_repetitions = flashcode.repetitions;

                let result = calculate_sm2(
                    previous_interval,
                    previous_ease_factor,
                    previous_repetitions,
                    answer,
                );

                // Calculate the new values based on the answer
                let mut due = flashcode.due_date;
                due += result.interval as u64;

                conn.execute(
                    "UPDATE flashcodes SET ease_factor = printf('%.4f', ?1), repetitions = ?2, interval = ?3, due_date = ?4 WHERE id = ?5",
                    params![result.ease_factor, result.repetitions, result.interval, due, id],
                )?;
            },
            Err(e) => {
                eprintln!("Error retrieving flashcode: {}", e);
                return Err(Error::QueryReturnedNoRows);
            }
        };


        Ok("Flashcode has been updated successfully".to_string())
    }

    pub fn delete_by_id(db: &DatabaseConnection, id: i64) -> Result<String, Error> {
        let conn = db.get_connection();

        conn.execute("DELETE FROM flashcodes WHERE id = ?1", params![id])?;

        Ok("Flashcode has been deleted successfully".to_string())
    }


    // function to get flashcard counts based 
    pub fn get_flashcard_count_by_category(
        db: &DatabaseConnection,
        deck_id: i64,
    ) -> Result<(usize, usize, usize), Error> {
        let conn = db.get_connection();

        let new_count = conn.query_row(
            "SELECT COUNT(*) FROM flashcodes WHERE deck_id = ?1 AND repetitions = 0",
            params![deck_id],
            |row| row.get(0),
        )?;

        let learning_count = conn.query_row(
            "SELECT COUNT(*) FROM flashcodes WHERE deck_id = ?1 AND repetitions = 1",
            params![deck_id],
            |row| row.get(0),
        )?;

        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("Time went backwards");
        let today = seconds_to_days(now.as_secs());

        let review_count = conn.query_row(
            "SELECT COUNT(*) FROM flashcodes WHERE deck_id = ?1 AND repetitions = 2 AND due_date <= ?2",
            params![deck_id, today],
            |row| row.get(0),
        )?;


        Ok((new_count, learning_count, review_count))
    }
}

// function to convert seconds into days
pub fn seconds_to_days(seconds: u64) -> u64 {
    seconds / 86400
}
