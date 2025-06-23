use std::sync::Mutex;
use tauri::State;
use v_htmlescape::escape;

use crate::database::DatabaseConnection;
use crate::models::{Deck, DeckQueryParams, Flashcode, SearchResult, Snippet, SnippetFolder, SnippetQueryParams};
use crate::responses::{
    DeckWithCount, ErrorResponse, SuccessResponse, SuccessResponseWithCount, TodayQueuesResponse,
};
use crate::sm2::Answer;

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
) -> Result<SuccessResponseWithCount<Vec<DeckWithCount>>, ErrorResponse> {
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
                .map(|deck_with_counts| {
                    let (decks, counts) = deck_with_counts;
                    let mut decks_with_counts = Vec::new();

                    for deck in decks {
                        let (new_count, review_count, learning_count) =
                            Flashcode::get_flashcard_count_by_category(db, deck.id)
                                .unwrap_or_default();

                        decks_with_counts.push(DeckWithCount {
                            deck,
                            new_count,
                            review_count,
                            learning_count,
                        });
                    }

                    SuccessResponseWithCount::new(
                        "All decks retrieved".into(),
                        decks_with_counts,
                        counts,
                    )
                })
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
pub fn reset_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<i64>, ErrorResponse> {
    state
        .db
        .lock()
        .map_err(|poison_err| {
            eprintln!("Error locking database Mutex: {:?}", poison_err);
            ErrorResponse::new("Failed to acquire database lock".into())
        })
        .and_then(|db_guard| {
            let db = &*db_guard;

            match Deck::reset_all_flashcards(db, id) {
                Ok(msg) => Ok(SuccessResponse::new(msg, id)),
                Err(err) => {
                    eprintln!("Error reseting dekc: {:?}", err);
                    Err(ErrorResponse::new("Failed to reset deck".into()))
                }
            }
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
    is_reversed: bool,
) -> Result<SuccessResponse<Flashcode>, ErrorResponse> {
    let db_guard_result = state.db.lock();
    let back = format!("{}", escape(back));

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;

            let result =
                Flashcode::create(db, front, back.as_str(), deck_id, language, is_reversed);

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
pub fn get_flashcard_counts(
    state: State<'_, AppState>,
    deck_id: i64,
) -> Result<SuccessResponse<(usize, usize, usize)>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Flashcode::get_flashcard_count_by_category(db, deck_id) {
                Ok((new_count, review_count, learning_count)) => Ok(SuccessResponse::new(
                    "Flashcard counts retrieved successfully!".into(),
                    (new_count, review_count, learning_count),
                )),
                Err(e) => {
                    eprintln!("Failed to get flashcard counts: {:?}", e);
                    Err(ErrorResponse::new(format!(
                        "Failed to retrieve flashcard counts for deck id {}.",
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

#[tauri::command]
pub fn search(
    state: State<'_, AppState>,
    keyword: String,
) -> Result<SuccessResponse<Vec<super::models::SearchResult>>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match SearchResult::search(db, keyword) {
                Ok(results) => Ok(SuccessResponse::new(
                    "Search results retrieved successfully".into(),
                    results,
                )),
                Err(e) => {
                    eprintln!("Failed to search: {:?}", e);
                    Err(ErrorResponse::new("Failed to perform search.".into()))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}

// Snippet commands
#[tauri::command]
pub fn create_snippet(
    state: State<'_, AppState>,
    title: String,
    code: String,
    language: String,
    description: Option<String>,
    tags: Option<String>,
    folder_id: Option<i64>,
) -> Result<SuccessResponse<Snippet>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            let code_escaped = escape(&code).to_string();

            match Snippet::create(
                db,
                &title,
                &code_escaped,
                &language,
                description.as_deref(),
                tags.as_deref(),
                folder_id,
            ) {
                Ok(snippet) => Ok(SuccessResponse::new(
                    "Snippet created successfully".into(),
                    snippet,
                )),
                Err(e) => {
                    eprintln!("Failed to create snippet: {:?}", e);
                    Err(ErrorResponse::new("Failed to create snippet".into()))
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
pub fn get_snippet(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<Snippet>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Snippet::get(db, id) {
                Ok(snippet) => Ok(SuccessResponse::new(
                    "Snippet retrieved successfully".into(),
                    snippet,
                )),
                Err(e) => {
                    eprintln!("Failed to get snippet: {:?}", e);
                    Err(ErrorResponse::new(format!("Snippet with id {} not found", id)))
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
pub fn get_all_snippets(
    state: State<'_, AppState>,
    query_params: SnippetQueryParams,
) -> Result<SuccessResponseWithCount<Vec<Snippet>>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Snippet::get_all(db, query_params) {
                Ok((snippets, total_count)) => Ok(SuccessResponseWithCount::new(
                    "Snippets retrieved successfully".into(),
                    snippets,
                    total_count,
                )),
                Err(e) => {
                    eprintln!("Failed to get snippets: {:?}", e);
                    Err(ErrorResponse::new("Failed to retrieve snippets".into()))
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
pub fn update_snippet(
    state: State<'_, AppState>,
    snippet: Snippet,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let db_guard_result = state.db.lock();
    let updated_snippet = Snippet {
        code: escape(&snippet.code).to_string(),
        ..snippet
    };

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match updated_snippet.update(db) {
                Ok(message) => Ok(SuccessResponse::new(
                    message,
                    format!("Snippet with id {} updated", snippet.id),
                )),
                Err(e) => {
                    eprintln!("Failed to update snippet {}: {:?}", snippet.id, e);
                    Err(ErrorResponse::new(format!(
                        "Failed to update snippet with id {}",
                        snippet.id
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
pub fn delete_snippet(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Snippet::delete_by_id(db, id) {
                Ok(message) => Ok(SuccessResponse::new(
                    message,
                    format!("Snippet with id {} deleted", id),
                )),
                Err(e) => {
                    eprintln!("Failed to delete snippet {}: {:?}", id, e);
                    Err(ErrorResponse::new(format!(
                        "Failed to delete snippet with id {}",
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
pub fn search_snippets(
    state: State<'_, AppState>,
    keyword: String,
) -> Result<SuccessResponse<Vec<Snippet>>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match Snippet::search(db, keyword) {
                Ok(snippets) => Ok(SuccessResponse::new(
                    "Snippet search completed successfully".into(),
                    snippets,
                )),
                Err(e) => {
                    eprintln!("Failed to search snippets: {:?}", e);
                    Err(ErrorResponse::new("Failed to search snippets".into()))
                }
            }
        }
        Err(e) => {
            eprintln!("Error acquiring the lock: {:?}", e);
            Err(ErrorResponse::new("Internal server error".into()))
        }
    }
}

// Snippet folder commands
#[tauri::command]
pub fn create_snippet_folder(
    state: State<'_, AppState>,
    name: String,
    parent_id: Option<i64>,
) -> Result<SuccessResponse<SnippetFolder>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match SnippetFolder::create(db, &name, parent_id) {
                Ok(folder) => Ok(SuccessResponse::new(
                    "Folder created successfully".into(),
                    folder,
                )),
                Err(e) => {
                    eprintln!("Failed to create folder: {:?}", e);
                    Err(ErrorResponse::new("Failed to create folder".into()))
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
pub fn get_snippet_folders(
    state: State<'_, AppState>,
) -> Result<SuccessResponse<Vec<SnippetFolder>>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match SnippetFolder::get_all(db) {
                Ok(folders) => Ok(SuccessResponse::new(
                    "Folders retrieved successfully".into(),
                    folders,
                )),
                Err(e) => {
                    eprintln!("Failed to get folders: {:?}", e);
                    Err(ErrorResponse::new("Failed to retrieve folders".into()))
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
pub fn delete_snippet_folder(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let db_guard_result = state.db.lock();

    match db_guard_result {
        Ok(db_guard) => {
            let db = &*db_guard;
            match SnippetFolder::delete_by_id(db, id) {
                Ok(message) => Ok(SuccessResponse::new(
                    message,
                    format!("Folder with id {} deleted", id),
                )),
                Err(e) => {
                    eprintln!("Failed to delete folder {}: {:?}", id, e);
                    Err(ErrorResponse::new(format!(
                        "Failed to delete folder with id {}",
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
