use crate::DatabaseConnection;
use rusqlite::{params, Error};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckQueryParams {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub is_favorite: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Deck {
    pub id: i64,
    pub name: String,
    pub is_favorite: bool,
}

impl Deck {
    pub fn create(db: &DatabaseConnection, name: &str) -> Result<Self, String> {
        let conn = db.get_connection();

        let res: Result<usize, Error> =
            conn.execute("INSERT INTO decks (name) VALUES (?1)", params![name]);

        let _ = match res {
            Ok(val) => val,
            Err(err) => {
                println!("Creation failed: {}", err);
                return Err(err.to_string());
            }
        };

        let id = conn.last_insert_rowid();
        Ok(Deck {
            id,
            name: name.to_string(),
            is_favorite: false,
        })
    }

    pub fn get(db: &DatabaseConnection, id: i64) -> Result<Self, Error> {
        let conn = db.get_connection();
        conn.query_row(
            "SELECT id, name, is_favorite FROM decks WHERE id = ?1",
            params![id],
            |row| {
                Ok(Deck {
                    id: row.get("id")?,
                    name: row.get("name")?,
                    is_favorite: row.get("is_favorite")?,
                })
            },
        )
    }

    pub fn get_all(
        db: &DatabaseConnection,
        query_params: DeckQueryParams,
    ) -> Result<(Vec<Self>, usize), Error> {
        let mut query = "SELECT id, name, is_favorite FROM decks".to_string();
        let mut where_clauses = Vec::new();
        let mut params_vec: Vec<i32> = Vec::new();
        let param_index = 1;

        if let Some(is_favorite_str) = query_params.is_favorite {
            let val: Option<i32> = match is_favorite_str.as_str() {
                "true" => Some(1),
                "false" => Some(0),
                _ => None,
            };

            if let Some(db_val) = val {
                where_clauses.push(format!("is_favorite = ?{}", param_index));
                params_vec.push(db_val);
            }
        }

        if !where_clauses.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&where_clauses.join(" AND "));
        }

        query.push_str(" ORDER BY created_at ASC");

        let limit = query_params.limit.unwrap_or(5);
        let page = query_params.page.unwrap_or(1);
        let offset = (page - 1) * limit;

        query.push_str(" LIMIT ? OFFSET ?");
        params_vec.push(limit as i32);
        params_vec.push(offset as i32);

        let params: Vec<&dyn rusqlite::types::ToSql> = params_vec
            .iter()
            .map(|x| x as &dyn rusqlite::types::ToSql)
            .collect();

        let conn = db.get_connection();
        let total_count =
            conn.query_row("SELECT COUNT(*) FROM decks", params![], |row| row.get(0))?;
        let mut stmt = conn.prepare(&query)?;

        let decks = stmt.query_map(params.as_slice(), |row| {
            Ok(Deck {
                id: row.get("id")?,
                name: row.get("name")?,
                is_favorite: row.get("is_favorite")?,
            })
        })?;

        let mut results: Vec<Deck> = Vec::new();

        for deck in decks {
            results.push(deck?);
        }

        Ok((results, total_count))
    }

    pub fn update(&self, db: &DatabaseConnection) -> Result<String, Error> {
        let conn = db.get_connection();

        conn.execute(
            "UPDATE decks SET name = ?1, is_favorite = ?2 WHERE id = ?3",
            params![&self.name, &self.is_favorite, &self.id],
        )?;

        Ok("Deck has been updated successfully".to_string())
    }

    // given the id of the deck, reset ease factor, interval and repetition to default values
    pub fn reset_all_flashcards(db: &DatabaseConnection, deck_id: i64) -> Result<String, Error> {
        let conn = db.get_connection();

        conn.execute(
            "UPDATE flashcodes SET ease_factor = 2.5, interval = 1, repetitions = 0 WHERE deck_id = ?1",
            params![deck_id],
        )?;

        Ok("Deck have been reset successfully".to_string())
    }

    pub fn delete(&self, db: &DatabaseConnection) -> Result<String, Error> {
        let conn = db.get_connection();

        conn.execute("DELETE FROM decks WHERE id = ?1 ", params![self.id])?;

        Ok("Deck has been deleted successfully".to_string())
    }
}
