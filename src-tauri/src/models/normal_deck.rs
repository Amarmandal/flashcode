use std::time::SystemTime;

use crate::{
    database::DatabaseConnection,
    models::seconds_to_days,
    sm2::{calculate_sm2, Answer},
};
use rusqlite::{params, Error};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalDeck {
    pub id: i64,
    pub name: String,
    pub is_favorite: bool,
    pub deck_category: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalCard {
    pub id: i64,
    pub deck_id: i64,
    pub front: String,
    pub back: String,
    pub ease_factor: f32,
    pub repetitions: u32,
    pub interval: u32,
    pub due_date: u64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalQueuesResponse {
    pub cards: Vec<NormalCard>,
    pub new: usize,
    pub learning: usize,
    pub to_review: usize,
}

impl NormalDeck {
    pub fn create(db: &DatabaseConnection, name: &str) -> Result<Self, String> {
        let conn = db.get_connection();
        conn.execute("INSERT INTO normal_decks (name) VALUES (?1)", params![name])
            .map_err(|e| e.to_string())?;
        let id = conn.last_insert_rowid();
        Ok(NormalDeck {
            id,
            name: name.to_string(),
            is_favorite: false,
            deck_category: "normal".to_string(),
        })
    }

    pub fn get(db: &DatabaseConnection, id: i64) -> Result<Self, Error> {
        let conn = db.get_connection();
        conn.query_row(
            "SELECT id, name, is_favorite, deck_category FROM normal_decks WHERE id = ?1",
            params![id],
            |row| {
                Ok(NormalDeck {
                    id: row.get("id")?,
                    name: row.get("name")?,
                    is_favorite: row.get("is_favorite")?,
                    deck_category: row.get("deck_category")?,
                })
            },
        )
    }

    pub fn get_all(db: &DatabaseConnection) -> Result<Vec<Self>, Error> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, name, is_favorite, deck_category FROM normal_decks ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map(params![], |row| {
            Ok(NormalDeck {
                id: row.get("id")?,
                name: row.get("name")?,
                is_favorite: row.get("is_favorite")?,
                deck_category: row.get("deck_category")?,
            })
        })?;
        rows.collect()
    }

    pub fn update(&self, db: &DatabaseConnection) -> Result<String, Error> {
        let conn = db.get_connection();
        conn.execute(
            "UPDATE normal_decks SET name = ?1, is_favorite = ?2 WHERE id = ?3",
            params![&self.name, &self.is_favorite, &self.id],
        )?;
        Ok("Deck updated successfully".to_string())
    }

    pub fn delete(&self, db: &DatabaseConnection) -> Result<String, Error> {
        let conn = db.get_connection();
        conn.execute("DELETE FROM normal_decks WHERE id = ?1", params![self.id])?;
        Ok("Deck deleted successfully".to_string())
    }

    pub fn reset_all_cards(db: &DatabaseConnection, deck_id: i64) -> Result<String, Error> {
        let conn = db.get_connection();

        conn.execute(
            "UPDATE normal_cards SET ease_factor = 2.5, interval = 1, repetitions = 0 WHERE deck_id = ?1",
            params![deck_id],
        )?;

        Ok("Deck has been reset successfully".to_string())
    }
}

impl NormalCard {
    fn row_to_card(row: &rusqlite::Row) -> rusqlite::Result<NormalCard> {
        Ok(NormalCard {
            id: row.get("id")?,
            deck_id: row.get("deck_id")?,
            front: row.get("front")?,
            back: row.get("back")?,
            ease_factor: row.get("ease_factor")?,
            repetitions: row.get("repetitions")?,
            interval: row.get("interval")?,
            due_date: row.get("due_date")?,
            created_at: row.get("created_at")?,
        })
    }

    pub fn create(
        db: &DatabaseConnection,
        deck_id: i64,
        front: &str,
        back: &str,
    ) -> Result<Self, String> {
        let conn = db.get_connection();
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("Time went backwards");
        let due_date = seconds_to_days(now.as_secs());

        conn.execute(
            "INSERT INTO normal_cards (deck_id, front, back, due_date)
             VALUES (?1, ?2, ?3, ?4)",
            params![deck_id, front, back, due_date],
        )
        .map_err(|e| e.to_string())?;

        let id = conn.last_insert_rowid();
        conn.query_row(
            "SELECT id, deck_id, front, back, ease_factor, repetitions, interval, due_date, created_at
             FROM normal_cards WHERE id = ?1",
            params![id],
            |row| NormalCard::row_to_card(row),
        )
        .map_err(|e| e.to_string())
    }

    pub fn get_by_deck_id(db: &DatabaseConnection, deck_id: i64) -> Result<Vec<Self>, Error> {
        let conn = db.get_connection();
        let mut stmt = conn.prepare(
            "SELECT id, deck_id, front, back, ease_factor, repetitions, interval, due_date, created_at
             FROM normal_cards WHERE deck_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map(params![deck_id], |row| NormalCard::row_to_card(row))?;
        rows.collect()
    }

    pub fn get_queues_for_today(
        db: &DatabaseConnection,
        deck_id: i64,
    ) -> Result<NormalQueuesResponse, Error> {
        let all_cards = NormalCard::get_by_deck_id(db, deck_id)?;
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("Time went backwards");
        let today = seconds_to_days(now.as_secs());

        let mut new_cards: Vec<NormalCard> = Vec::new();
        let mut learning_cards: Vec<NormalCard> = Vec::new();
        let mut review_cards: Vec<NormalCard> = Vec::new();

        for card in all_cards {
            match card.repetitions {
                0 => new_cards.push(card),
                1 => learning_cards.push(card),
                _ => {
                    if card.due_date <= today {
                        review_cards.push(card);
                    }
                }
            }
        }

        learning_cards.sort_by_key(|c| c.due_date);
        review_cards.sort_by_key(|c| c.due_date);

        let new_count = new_cards.len();
        let learning_count = learning_cards.len();
        let review_count = review_cards.len();

        let mut cards: Vec<NormalCard> = Vec::new();
        let mut new_iter = new_cards.into_iter();
        let mut learn_iter = learning_cards.into_iter();
        let mut n = new_iter.next();
        let mut l = learn_iter.next();
        while n.is_some() && l.is_some() {
            cards.push(n.take().unwrap());
            cards.push(l.take().unwrap());
            n = new_iter.next();
            l = learn_iter.next();
        }
        if let Some(c) = n { cards.push(c); }
        if let Some(c) = l { cards.push(c); }
        cards.extend(new_iter);
        cards.extend(learn_iter);
        cards.extend(review_cards);

        Ok(NormalQueuesResponse {
            cards,
            new: new_count,
            learning: learning_count,
            to_review: review_count,
        })
    }

    pub fn update_based_on_answer(
        db: &DatabaseConnection,
        id: i64,
        answer: Answer,
    ) -> Result<String, Error> {
        let conn = db.get_connection();
        let card = conn.query_row(
            "SELECT id, deck_id, front, back, ease_factor, repetitions, interval, due_date, created_at
             FROM normal_cards WHERE id = ?1",
            params![id],
            |row| NormalCard::row_to_card(row),
        )?;

        let result = calculate_sm2(card.interval, card.ease_factor, card.repetitions, answer);
        let new_due = card.due_date + result.interval as u64;

        conn.execute(
            "UPDATE normal_cards SET ease_factor = ?1, repetitions = ?2, interval = ?3, due_date = ?4
             WHERE id = ?5",
            params![result.ease_factor, result.repetitions, result.interval, new_due, id],
        )?;

        Ok("Card updated successfully".to_string())
    }

    pub fn delete(db: &DatabaseConnection, id: i64) -> Result<String, Error> {
        let conn = db.get_connection();
        conn.execute("DELETE FROM normal_cards WHERE id = ?1", params![id])?;
        Ok("Card deleted successfully".to_string())
    }

}
