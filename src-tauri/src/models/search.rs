use serde::{Deserialize, Serialize};

use crate::database::DatabaseConnection;

#[derive(Debug, PartialEq, Deserialize, Serialize)]
pub enum SearchType {
    Card,
    Deck,
}

impl SearchType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SearchType::Card => "card",
            SearchType::Deck => "deck",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub entity_type: SearchType,
    pub card_count: i32,
}

impl SearchResult {
    pub fn new(id: String, title: String, entity_type: SearchType, card_count: i32) -> Self {
        SearchResult {
            id,
            title,
            entity_type,
            card_count,
        }
    }

    pub fn search(db: &DatabaseConnection, keyword: String) -> Result<Vec<SearchResult>, String> {
        let conn = db.get_connection();

        // sql query to search for deck if keyword is contained in name
        // sql query to search for flashcard if keyword contained in front if card is not reversed
        // interlieved the result of deck and flashcard to the SearchResult type and return vector response
        let mut results = Vec::new();
        let deck_query = "SELECT id, name FROM decks WHERE name LIKE ?1";
        let mut stmt = conn.prepare(deck_query).map_err(|e| e.to_string())?;
        let deck_rows = stmt
            .query_map([format!("%{}%", keyword)], |row| {
                Ok(SearchResult::new(
                    row.get::<_, i64>(0)?.to_string(),
                    row.get::<_, String>(1)?,
                    SearchType::Deck,
                    0, // Decks don't have a card count in this context
                ))
            })
            .map_err(|e| e.to_string())?;

        for deck in deck_rows {
            match deck {
                Ok(deck_result) => results.push(deck_result),
                Err(e) => return Err(e.to_string()),
            }
        }

        let card_query =
            "SELECT id, front, back FROM flashcodes WHERE (front LIKE ?1 OR back LIKE ?1) AND is_reversed = 0";
        let mut stmt = conn.prepare(card_query).map_err(|e| e.to_string())?;
        let card_rows = stmt
            .query_map([format!("%{}%", keyword)], |row| {
                Ok(SearchResult::new(
                    row.get::<_, i64>(0)?.to_string(),
                    row.get::<_, String>(1)?,
                    SearchType::Card,
                    0, // Card count is not applicable here, but can be set if needed
                ))
            })
            .map_err(|e| e.to_string())?;

        for card in card_rows {
            match card {
                Ok(card_result) => results.push(card_result),
                Err(e) => return Err(e.to_string()),
            }
        }

        // Sort results by entity type (Decks first) and then by title
        results.sort_by(|a, b| {
            if a.entity_type == b.entity_type {
                a.title.cmp(&b.title)
            } else {
                a.entity_type.as_str().cmp(b.entity_type.as_str())
            }
        });
        Ok(results)
    }
}
