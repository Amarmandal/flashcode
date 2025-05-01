use std::sync::Mutex;
use tauri::State;
use v_htmlescape::escape;

use super::{
    database::DatabaseConnection,
    models::{Deck, DeckQueryParams, Flashcode},
    responses::{ErrorResponse, SuccessResponse, TodayQueuesResponse},
    sm2::Answer,
};

pub struct AppState {
    pub db: Mutex<DatabaseConnection>,
}

#[tauri::command]
pub fn create_deck(
    state: State<'_, AppState>,
    name: String,
) -> Result<SuccessResponse<Deck>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            let deck_result = Deck::create(db, &name);

            match deck_result {
                Ok(deck) => Ok(SuccessResponse::new(
                    "Deck created successfully".into(),
                    deck,
                )),
                Err(e) => Err(ErrorResponse::new(e)),
            }
        }
        Err(poison_err) => {
            eprintln!("Error locking database Mutex: {:?}", poison_err);
            Err(ErrorResponse::new(
                "Failed to acquire database lock due to potential previous error.".into(),
            ))
        }
    }
}

#[tauri::command]
pub fn get_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<Deck>, ErrorResponse> {
    // concise way to handle error of mutex lock
    state
        .db
        .lock()
        .map_err(|poison_err| {
            eprintln!("Error locking database Mutex: {:?}", poison_err);
            ErrorResponse::new("Failed to acquire database lock".into())
        })
        .and_then(|db_guard| {
            let db = &*db_guard;
            Deck::get(db, id)
                .map(|deck| SuccessResponse::new("Deck found".into(), deck))
                .map_err(|db_error| {
                    eprintln!("Not found: {:?}", db_error);
                    ErrorResponse::new(format!("Record not found for id {}", id))
                })
        })
}

#[tauri::command]
pub fn get_all_decks(
    state: State<'_, AppState>,
    query_params: DeckQueryParams,
) -> Result<SuccessResponse<Vec<Deck>>, ErrorResponse> {
    state
        .db
        .lock()
        .map_err(|poison_err| {
            eprintln!("Error locking database Mutex: {:?}", poison_err);
            ErrorResponse::new("Failed to acquire database lock".into())
        })
        .and_then(|db_guard| {
            let db = &*db_guard;
            Deck::get_all(db, query_params)
                .map(|decks| SuccessResponse::new("All decks retrieved".into(), decks))
                .map_err(|db_error| {
                    eprintln!("Error fetching all decks: {:?}", db_error);
                    ErrorResponse::new("Failed to retrieve all decks from the database.".into())
                })
        })
}

#[tauri::command]
pub fn update_deck(
    state: State<'_, AppState>,
    deck: Deck,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    state
        .db
        .lock()
        .map_err(|poison_err| {
            eprintln!("Error locking database Mutex: {:?}", poison_err);
            ErrorResponse::new("Failed to acquire database lock".into())
        })
        .and_then(|db_guard| {
            let db = &*db_guard;
            deck.update(db)
                .map(|success_message| {
                    SuccessResponse::new("Deck updated successfully".into(), success_message)
                })
                .map_err(|db_error| {
                    eprintln!("Error updating deck: {:?}", db_error);
                    ErrorResponse::new(format!("Failed to update deck with id {}", deck.id))
                })
        })
}

#[tauri::command]
pub fn delete_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            let deck_to_delete = Deck {
                id,
                name: String::new(),
                is_favorite: false,
            };
            let delete_result = deck_to_delete.delete(db);

            match delete_result {
                Ok(success_message) => Ok(SuccessResponse::new(
                    success_message,
                    format!("Deck with id {} deleted successfully", id),
                )),
                Err(db_error) => {
                    eprintln!("Error deleting deck: {:?}", db_error);
                    Err(ErrorResponse::new(format!(
                        "Failed to delete deck with id {}",
                        id
                    )))
                }
            }
        }
        Err(poison_err) => {
            eprintln!("Error locking database Mutex: {:?}", poison_err);
            Err(ErrorResponse::new("Failed to acquire database lock".into()))
        }
    }
}

// all the flashcodes commands
#[tauri::command]
// function to get all the queues cards
// takes the deck_id as the parameter and returns the struct vec of flashcode
// it should also return the new, review and learning counts
// response should look like {today_queues: Vec<Flashcode>, new_count: usize, review_count: usize, learning_count: usize}
pub fn get_queues_for_today(
    state: State<'_, AppState>,
    deck_id: i64,
) -> Result<SuccessResponse<TodayQueuesResponse>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;

            match Flashcode::get_all_queues_cards(db, deck_id) {
                Ok((merged_cards, new_count, review_count, learning_count)) => {
                    Ok(SuccessResponse::new(
                        "Queues cards retrieved successfully!".into(),
                        TodayQueuesResponse::new(
                            merged_cards,
                            new_count,
                            review_count,
                            learning_count,
                        ),
                    ))
                }
                Err(e) => {
                    eprintln!("Failed to get queues cards: {:?}", e);
                    Err(ErrorResponse::new(format!(
                        "Failed to retrieve queues cards for deck id {}.",
                        deck_id
                    )))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}

#[tauri::command]
pub fn create_flashcode(
    state: State<'_, AppState>,
    front: &str,
    back: &str,
    deck_id: i64,
    language: &str,
) -> Result<SuccessResponse<Flashcode>, ErrorResponse> {
    let db_guard_result = state.db.lock();
    let back = format!("{}", escape(back));

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;

            let result = Flashcode::create(db, front, back.as_str(), deck_id, language);

            match result {
                Ok(flash_code) => Ok(SuccessResponse::new(
                    "Flashcard created success!".into(),
                    flash_code,
                )),
                Err(e) => {
                    eprintln!("Failed to create flashcode: {:?}", e);
                    Err(ErrorResponse::new("Failed to create new flashcard.".into()))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}

#[tauri::command]
pub fn get_flashcode(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<Flashcode>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Flashcode::get(db, id) {
                Ok(flash_code) => Ok(SuccessResponse::new(
                    "Flashcard retrieved successfully!".into(),
                    flash_code,
                )),
                Err(e) => {
                    eprintln!("Failed to get flashcode: {:?}", e);
                    Err(ErrorResponse::new(format!(
                        "Flashcard with id {} not found.",
                        id
                    )))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}

#[tauri::command]
pub fn get_flashcodes_by_deck(
    state: State<'_, AppState>,
    deck_id: i64,
) -> Result<SuccessResponse<Vec<Flashcode>>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Flashcode::get_by_deck_id(db, deck_id) {
                Ok(flashcodes) => Ok(SuccessResponse::new(
                    "Flashcode list retrieved successfully!".into(),
                    flashcodes,
                )),
                Err(e) => {
                    eprintln!("Failed to get flashcodes by deck id {}: {:?}", e, deck_id);
                    Err(ErrorResponse::new(format!(
                        "Failed to retrieve flashcards for deck id {}.",
                        deck_id
                    )))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}

#[tauri::command]
pub fn update_flashcode(
    state: State<'_, AppState>,
    flashcode: Flashcode,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let db_guard_result = state.db.lock();
    let new_flashcode = Flashcode {
        back: escape(&flashcode.back).to_string(),
        ..flashcode
    };

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match new_flashcode.update(db) {
                Ok(message) => Ok(SuccessResponse::new(
                    message,
                    format!("Flashcard with id {} updated!", flashcode.id),
                )),
                Err(e) => {
                    eprintln!("Failed to update flashcode {}: {:?}", flashcode.id, e);
                    Err(ErrorResponse::new(format!(
                        "Failed to update flashcard with id {}.",
                        flashcode.id
                    )))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}

#[tauri::command]
pub fn answer_flashcard(
    state: State<'_, AppState>,
    id: String,
    answer: Answer,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    println!("Answered received: {:?}", answer);

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Flashcode::update_based_on_answer(db, &id, answer) {
                Ok(message) => Ok(SuccessResponse::new(
                    message,
                    format!("Flashcard with id {} updated based on answer!", id),
                )),
                Err(e) => {
                    eprintln!("Failed to update flashcode {}: {:?}", id, e);
                    Err(ErrorResponse::new(format!(
                        "Failed to update flashcard with id {} based on answer.",
                        id
                    )))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}

#[tauri::command]
pub fn delete_flashcode(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Flashcode::delete_by_id(db, id) {
                Ok(message) => Ok(SuccessResponse::new(
                    message,
                    format!("Flashcard with id {} deleted!", id),
                )),
                Err(e) => {
                    eprintln!("Failed to delete flashcode {}: {:?}", id, e);
                    Err(ErrorResponse::new(format!(
                        "Failed to delete flashcard with id {}.",
                        id
                    )))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}
