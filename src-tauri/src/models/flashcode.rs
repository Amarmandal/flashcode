use rusqlite::{params, Error};
use serde::{Deserialize, Serialize};

use crate::{database::DatabaseConnection, responses::StateCountResponse};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FlashcardState {
    New = 0,
    Learning = 1,
    Review = 2,
}

impl FlashcardState {
    fn from_i32(value: i32) -> Option<Self> {
        match value {
            0 => Some(FlashcardState::New),
            1 => Some(FlashcardState::Learning),
            3 => Some(FlashcardState::Review),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Flashcode {
    pub id: i64,
    pub front: String,
    pub back: String,
    pub deck_id: i64,
    pub language: String,
    pub state: FlashcardState,
}

impl Flashcode {
    pub fn create(
        db: &DatabaseConnection,
        front: &str,
        back: &str,
        deck_id: i64,
        language: &str,
    ) -> Result<Self, Error> {
        let conn = db.get_connection();
        conn.execute(
            "INSERT INTO flashcodes (front, back, deck_id, language, state) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![front, back, deck_id, language, FlashcardState::New as i32],
        )?;
        let id = conn.last_insert_rowid();
        Ok(Flashcode {
            id,
            front: front.to_string(),
            back: back.to_string(),
            deck_id,
            language: language.to_string(),
            state: FlashcardState::New,
        })
    }

    pub fn get(db: &DatabaseConnection, id: i64) -> Result<Self, Error> {
        let conn = db.get_connection();
        conn.query_row(
            "SELECT id, front, back, deck_id, language, state FROM flashcodes WHERE id = ?1",
            params![id],
            |row| {
                let state = FlashcardState::from_i32(row.get("state")?)
                    .ok_or_else(|| rusqlite::Error::InvalidQuery);

                Ok(Flashcode {
                    id: row.get("id")?,
                    front: row.get("front")?,
                    back: row.get("back")?,
                    deck_id: row.get("deck_id")?,
                    language: row.get("language")?,
                    state: state?,
                })
            },
        )
    }

    pub fn get_by_deck_id(db: &DatabaseConnection, deck_id: i64) -> Result<Vec<Self>, Error> {
        let conn = db.get_connection();

        let mut stmt = conn.prepare(
            "SELECT id, front, back, deck_id, language, state FROM flashcodes WHERE deck_id = ?1",
        )?;

        let flashcodes = stmt.query_map(params![deck_id], |row| {
            let state = FlashcardState::from_i32(row.get("state")?)
                .ok_or_else(|| rusqlite::Error::InvalidQuery);

            Ok(Flashcode {
                id: row.get("id")?,
                front: row.get("front")?,
                back: row.get("back")?,
                deck_id: row.get("deck_id")?,
                language: row.get("language")?,
                state: state?,
            })
        })?;

        let mut results: Vec<Flashcode> = Vec::new();

        for item in flashcodes {
            results.push(item?);
        }

        Ok(results)
    }

    pub fn get_flash_counts(
        db: &DatabaseConnection,
        deck_id: i64,
    ) -> Result<StateCountResponse, Error> {
        let conn = db.get_connection();

        let mut response = StateCountResponse::new(0, 0, 0);

        let mut stmt = conn
            .prepare("SELECT state, COUNT(*) FROM flashcards WHERE deck_id = ? GROUP BY state")?;
        let rows = stmt.query_map([deck_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        for row_result in rows {
            let (state, count) = row_result?;

            if state == "0" {
                response.new = count
            } else if state == "1" {
                response.learning = count
            } else {
                response.to_review = count
            }
        }

        Ok(response)
    }

    pub fn update(&self, db: &DatabaseConnection) -> Result<String, Error> {
        let conn = db.get_connection();

        conn.execute(
            "UPDATE flashcodes SET front = ?1, back = ?2, language = ?3 WHERE id = ?4",
            params![&self.front, &self.back, &self.language, &self.id],
        )?;

        Ok("Flashcode has been updated successfully".to_string())
    }

    pub fn delete(&self, db: &DatabaseConnection) -> Result<String, Error> {
        let conn = db.get_connection();

        conn.execute("DELETE FROM flashcodes WHERE id = ?1", params![&self.id])?;

        Ok("Flashcode has been deleted successfully".to_string())
    }
}
