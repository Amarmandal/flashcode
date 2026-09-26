use std::sync::{Arc, Mutex};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager, State};
use v_htmlescape::escape;
use chrono::Local;
use serde::{Deserialize, Serialize};

use crate::database::DatabaseConnection;
use crate::models::{
    Deck, DeckQueryParams, Flashcode, NormalCard, NormalDeck, NormalQueuesResponse, Quiz,
    QuizOption, QuizQuestion, QuizWithQuestions, SearchResult, Snippet, SnippetFolder,
    SnippetQueryParams,
};
use crate::responses::{
    DeckWithCount, ErrorResponse, SuccessResponse, SuccessResponseWithCount, TodayQueuesResponse,
};
use crate::sm2::Answer;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<DatabaseConnection>>,
}

/// Validates that a native session is active and not expired.
/// Enforces the account boundary in native commands.
fn require_active_session(db: &DatabaseConnection) -> Result<(), String> {
    let current_uid = db.current_user_id()
        .ok_or_else(|| "No active user session. Please sign in.".to_string())?;

    let creds = crate::oauth::load_credentials()?
        .ok_or_else(|| "No active native session found. Please sign in.".to_string())?;

    if !crate::oauth::is_session_valid(&creds) {
        return Err("Session has expired. Please sign in again.".to_string());
    }

    if creds.user_id != current_uid {
        return Err("User session mismatch. Please sign in again.".to_string());
    }

    Ok(())
}

// Helper function to run blocking database operations in a thread pool
async fn run_db_operation<F, T>(state: &Arc<Mutex<DatabaseConnection>>, operation: F) -> Result<T, ErrorResponse>
where
    F: FnOnce(&DatabaseConnection) -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    let state = Arc::clone(state);

    tokio::task::spawn_blocking(move || {
        let db_guard = state.lock().map_err(|poison_err| {
            eprintln!("Error locking database Mutex: {:?}", poison_err);
            ErrorResponse::new("Failed to acquire database lock".into())
        })?;

        let db = &*db_guard;
        require_active_session(db).map_err(|e| ErrorResponse::new(e))?;
        operation(db).map_err(|e| ErrorResponse::new(e))
    })
    .await
    .map_err(|e| {
        eprintln!("Task join error: {:?}", e);
        ErrorResponse::new("Database operation failed".into())
    })?
}

#[tauri::command]
pub async fn create_deck(
    state: State<'_, AppState>,
    name: String,
) -> Result<SuccessResponse<Deck>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Deck::create(db, &name).map(|deck| SuccessResponse::new("Deck created successfully".into(), deck))
    })
    .await
}

#[tauri::command]
pub async fn get_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<Deck>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Deck::get(db, id)
            .map(|deck| SuccessResponse::new("Deck found".into(), deck))
            .map_err(|db_error| {
                eprintln!("Not found: {:?}", db_error);
                format!("Record not found for id {}", id)
            })
    })
    .await
}

#[tauri::command]
pub async fn get_all_decks(
    state: State<'_, AppState>,
    query_params: DeckQueryParams,
) -> Result<SuccessResponseWithCount<Vec<DeckWithCount>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
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
                "Failed to retrieve all decks from the database.".to_string()
            })
    })
    .await
}

#[tauri::command]
pub async fn update_deck(
    state: State<'_, AppState>,
    deck: Deck,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let deck_id = deck.id;
    run_db_operation(&state.db, move |db| {
        deck.update(db)
            .map(|success_message| {
                SuccessResponse::new("Deck updated successfully".into(), success_message)
            })
            .map_err(|db_error| {
                eprintln!("Error updating deck: {:?}", db_error);
                format!("Failed to update deck with id {}", deck_id)
            })
    })
    .await
}

#[tauri::command]
pub async fn reset_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<i64>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Deck::reset_all_flashcards(db, id)
            .map(|msg| SuccessResponse::new(msg, id))
            .map_err(|err| {
                eprintln!("Error reseting dekc: {:?}", err);
                "Failed to reset deck".to_string()
            })
    })
    .await
}

#[tauri::command]
pub async fn delete_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        let deck_to_delete = Deck {
            id,
            name: String::new(),
            is_favorite: false,
        };
        deck_to_delete
            .delete(db)
            .map(|success_message| {
                SuccessResponse::new(
                    success_message,
                    format!("Deck with id {} deleted successfully", id),
                )
            })
            .map_err(|db_error| {
                eprintln!("Error deleting deck: {:?}", db_error);
                format!("Failed to delete deck with id {}", id)
            })
    })
    .await
}

// all the flashcodes commands
#[tauri::command]
// function to get all the queues cards
// takes the deck_id as the parameter and returns the struct vec of flashcode
// it should also return the new, review and learning counts
// response should look like {today_queues: Vec<Flashcode>, new_count: usize, review_count: usize, learning_count: usize}
pub async fn get_queues_for_today(
    state: State<'_, AppState>,
    deck_id: i64,
) -> Result<SuccessResponse<TodayQueuesResponse>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Flashcode::get_all_queues_cards(db, deck_id)
            .map(|(merged_cards, new_count, review_count, learning_count)| {
                SuccessResponse::new(
                    "Queues cards retrieved successfully!".into(),
                    TodayQueuesResponse::new(
                        merged_cards,
                        new_count,
                        review_count,
                        learning_count,
                    ),
                )
            })
            .map_err(|e| {
                eprintln!("Failed to get queues cards: {:?}", e);
                format!("Failed to retrieve queues cards for deck id {}.", deck_id)
            })
    })
    .await
}

#[tauri::command]
pub async fn create_flashcode(
    state: State<'_, AppState>,
    front: String,
    back: String,
    deck_id: i64,
    language: String,
    is_reversed: bool,
) -> Result<SuccessResponse<Flashcode>, ErrorResponse> {
    let back_escaped = format!("{}", escape(&back));

    run_db_operation(&state.db, move |db| {
        Flashcode::create(db, &front, &back_escaped, deck_id, &language, is_reversed)
            .map(|flash_code| {
                SuccessResponse::new("Flashcard created success!".into(), flash_code)
            })
            .map_err(|e| {
                eprintln!("Failed to create flashcode: {:?}", e);
                "Failed to create new flashcard.".to_string()
            })
    })
    .await
}

#[tauri::command]
pub async fn get_flashcard_counts(
    state: State<'_, AppState>,
    deck_id: i64,
) -> Result<SuccessResponse<(usize, usize, usize)>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Flashcode::get_flashcard_count_by_category(db, deck_id)
            .map(|(new_count, review_count, learning_count)| {
                SuccessResponse::new(
                    "Flashcard counts retrieved successfully!".into(),
                    (new_count, review_count, learning_count),
                )
            })
            .map_err(|e| {
                eprintln!("Failed to get flashcard counts: {:?}", e);
                format!("Failed to retrieve flashcard counts for deck id {}.", deck_id)
            })
    })
    .await
}

#[tauri::command]
pub async fn get_flashcode(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<Flashcode>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Flashcode::get(db, id)
            .map(|flash_code| {
                SuccessResponse::new("Flashcard retrieved successfully!".into(), flash_code)
            })
            .map_err(|e| {
                eprintln!("Failed to get flashcode: {:?}", e);
                format!("Flashcard with id {} not found.", id)
            })
    })
    .await
}

#[tauri::command]
pub async fn get_flashcodes_by_deck(
    state: State<'_, AppState>,
    deck_id: i64,
) -> Result<SuccessResponse<Vec<Flashcode>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Flashcode::get_by_deck_id(db, deck_id)
            .map(|flashcodes| {
                SuccessResponse::new("Flashcode list retrieved successfully!".into(), flashcodes)
            })
            .map_err(|e| {
                eprintln!("Failed to get flashcodes by deck id {}: {:?}", e, deck_id);
                format!("Failed to retrieve flashcards for deck id {}.", deck_id)
            })
    })
    .await
}

#[tauri::command]
pub async fn update_flashcode(
    state: State<'_, AppState>,
    flashcode: Flashcode,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let flashcode_id = flashcode.id;
    let new_flashcode = Flashcode {
        back: escape(&flashcode.back).to_string(),
        ..flashcode
    };

    run_db_operation(&state.db, move |db| {
        new_flashcode
            .update(db)
            .map(|message| {
                SuccessResponse::new(
                    message,
                    format!("Flashcard with id {} updated!", flashcode_id),
                )
            })
            .map_err(|e| {
                eprintln!("Failed to update flashcode {}: {:?}", flashcode_id, e);
                format!("Failed to update flashcard with id {}.", flashcode_id)
            })
    })
    .await
}

#[tauri::command]
pub async fn answer_flashcard(
    state: State<'_, AppState>,
    id: String,
    answer: Answer,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Flashcode::update_based_on_answer(db, &id, answer)
            .map(|message| {
                SuccessResponse::new(
                    message,
                    format!("Flashcard with id {} updated based on answer!", id),
                )
            })
            .map_err(|e| {
                eprintln!("Failed to update flashcode {}: {:?}", id, e);
                format!("Failed to update flashcard with id {} based on answer.", id)
            })
    })
    .await
}

#[tauri::command]
pub async fn delete_flashcode(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Flashcode::delete_by_id(db, id)
            .map(|message| {
                SuccessResponse::new(message, format!("Flashcard with id {} deleted!", id))
            })
            .map_err(|e| {
                eprintln!("Failed to delete flashcode {}: {:?}", id, e);
                format!("Failed to delete flashcard with id {}.", id)
            })
    })
    .await
}

#[tauri::command]
pub async fn search(
    state: State<'_, AppState>,
    keyword: String,
) -> Result<SuccessResponse<Vec<super::models::SearchResult>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        SearchResult::search(db, keyword)
            .map(|results| {
                SuccessResponse::new("Search results retrieved successfully".into(), results)
            })
            .map_err(|e| {
                eprintln!("Failed to search: {:?}", e);
                "Failed to perform search.".to_string()
            })
    })
    .await
}

// Snippet commands
#[tauri::command]
pub async fn create_snippet(
    state: State<'_, AppState>,
    title: String,
    code: String,
    language: String,
    description: Option<String>,
    tags: Option<String>,
    folder_id: Option<i64>,
) -> Result<SuccessResponse<Snippet>, ErrorResponse> {
    let code_escaped = escape(&code).to_string();
    let description_cleaned = description.as_ref().map(|d| ammonia::clean(d).to_string());

    run_db_operation(&state.db, move |db| {
        Snippet::create(
            db,
            &title,
            &code_escaped,
            &language,
            description_cleaned.as_deref(),
            tags.as_deref(),
            folder_id,
        )
        .map(|snippet| SuccessResponse::new("Snippet created successfully".into(), snippet))
        .map_err(|e| {
            eprintln!("Failed to create snippet: {:?}", e);
            "Failed to create snippet".to_string()
        })
    })
    .await
}

#[tauri::command]
pub async fn get_snippet(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<Snippet>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Snippet::get(db, id)
            .map(|snippet| SuccessResponse::new("Snippet retrieved successfully".into(), snippet))
            .map_err(|e| {
                eprintln!("Failed to get snippet: {:?}", e);
                format!("Snippet with id {} not found", id)
            })
    })
    .await
}

#[tauri::command]
pub async fn get_all_snippets(
    state: State<'_, AppState>,
    query_params: SnippetQueryParams,
) -> Result<SuccessResponseWithCount<Vec<Snippet>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Snippet::get_all(db, query_params)
            .map(|(snippets, total_count)| {
                SuccessResponseWithCount::new(
                    "Snippets retrieved successfully".into(),
                    snippets,
                    total_count,
                )
            })
            .map_err(|e| {
                eprintln!("Failed to get snippets: {:?}", e);
                "Failed to retrieve snippets".to_string()
            })
    })
    .await
}

#[tauri::command]
pub async fn update_snippet(
    state: State<'_, AppState>,
    snippet: Snippet,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let snippet_id = snippet.id;
    let description = snippet
        .description
        .as_ref()
        .map(|d| ammonia::clean(d).to_string());
    let updated_snippet = Snippet {
        description,
        ..snippet
    };

    run_db_operation(&state.db, move |db| {
        updated_snippet
            .update(db)
            .map(|message| {
                SuccessResponse::new(message, format!("Snippet with id {} updated", snippet_id))
            })
            .map_err(|e| {
                eprintln!("Failed to update snippet {}: {:?}", snippet_id, e);
                format!("Failed to update snippet with id {}", snippet_id)
            })
    })
    .await
}

#[tauri::command]
pub async fn delete_snippet(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Snippet::delete_by_id(db, id)
            .map(|message| SuccessResponse::new(message, format!("Snippet with id {} deleted", id)))
            .map_err(|e| {
                eprintln!("Failed to delete snippet {}: {:?}", id, e);
                format!("Failed to delete snippet with id {}", id)
            })
    })
    .await
}

#[tauri::command]
pub async fn search_snippets(
    state: State<'_, AppState>,
    keyword: String,
) -> Result<SuccessResponse<Vec<Snippet>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        Snippet::search(db, keyword)
            .map(|snippets| {
                SuccessResponse::new("Snippet search completed successfully".into(), snippets)
            })
            .map_err(|e| {
                eprintln!("Failed to search snippets: {:?}", e);
                "Failed to search snippets".to_string()
            })
    })
    .await
}

// Snippet folder commands
#[tauri::command]
pub async fn create_snippet_folder(
    state: State<'_, AppState>,
    name: String,
    parent_id: Option<i64>,
) -> Result<SuccessResponse<SnippetFolder>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        SnippetFolder::create(db, &name, parent_id)
            .map(|folder| SuccessResponse::new("Folder created successfully".into(), folder))
            .map_err(|e| {
                eprintln!("Failed to create folder: {:?}", e);
                "Failed to create folder".to_string()
            })
    })
    .await
}

#[tauri::command]
pub async fn get_snippet_folders(
    state: State<'_, AppState>,
) -> Result<SuccessResponse<Vec<SnippetFolder>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        SnippetFolder::get_all(db)
            .map(|folders| SuccessResponse::new("Folders retrieved successfully".into(), folders))
            .map_err(|e| {
                eprintln!("Failed to get folders: {:?}", e);
                "Failed to retrieve folders".to_string()
            })
    })
    .await
}

#[tauri::command]
pub async fn delete_snippet_folder(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        SnippetFolder::delete_by_id(db, id)
            .map(|message| SuccessResponse::new(message, format!("Folder with id {} deleted", id)))
            .map_err(|e| {
                eprintln!("Failed to delete folder {}: {:?}", id, e);
                format!("Failed to delete folder with id {}", id)
            })
    })
    .await
}

// ===== Normal Deck Commands =====

#[tauri::command]
pub async fn create_normal_deck(
    state: State<'_, AppState>,
    name: String,
) -> Result<SuccessResponse<NormalDeck>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalDeck::create(db, &name)
            .map(|deck| SuccessResponse::new("Normal deck created successfully".into(), deck))
    })
    .await
}

#[tauri::command]
pub async fn get_all_normal_decks(
    state: State<'_, AppState>,
) -> Result<SuccessResponse<Vec<NormalDeck>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalDeck::get_all(db)
            .map(|decks| SuccessResponse::new("Normal decks retrieved".into(), decks))
            .map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn get_normal_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<NormalDeck>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalDeck::get(db, id)
            .map(|deck| SuccessResponse::new("Normal deck found".into(), deck))
            .map_err(|_| format!("Normal deck with id {} not found", id))
    })
    .await
}

#[tauri::command]
pub async fn update_normal_deck(
    state: State<'_, AppState>,
    deck: NormalDeck,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        deck.update(db)
            .map(|msg| SuccessResponse::new(msg.clone(), msg))
            .map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn delete_normal_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalDeck::get(db, id)
            .map_err(|_| format!("Normal deck with id {} not found", id))
            .and_then(|deck| {
                deck.delete(db)
                    .map(|msg| SuccessResponse::new(msg.clone(), msg))
                    .map_err(|e| e.to_string())
            })
    })
    .await
}

#[tauri::command]
pub async fn reset_normal_deck(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<i64>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalDeck::reset_all_cards(db, id)
            .map(|msg| SuccessResponse::new(msg, id))
            .map_err(|err| {
                eprintln!("Error resetting normal deck: {:?}", err);
                "Failed to reset normal deck".to_string()
            })
    })
    .await
}

#[tauri::command]
pub async fn create_normal_card(
    state: State<'_, AppState>,
    deck_id: i64,
    front: String,
    back: String,
    image_data: Option<String>,
) -> Result<SuccessResponse<NormalCard>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalCard::create(db, deck_id, &front, &back, image_data.as_deref())
            .map(|c| SuccessResponse::new("Card created successfully".into(), c))
    })
    .await
}

#[tauri::command]
pub async fn get_normal_cards_by_deck(
    state: State<'_, AppState>,
    deck_id: i64,
) -> Result<SuccessResponse<Vec<NormalCard>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalCard::get_by_deck_id(db, deck_id)
            .map(|cards| SuccessResponse::new("Cards retrieved".into(), cards))
            .map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn get_normal_queues_for_today(
    state: State<'_, AppState>,
    deck_id: i64,
) -> Result<SuccessResponse<NormalQueuesResponse>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalCard::get_queues_for_today(db, deck_id)
            .map(|q| SuccessResponse::new("Queues retrieved".into(), q))
            .map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn answer_normal_card(
    state: State<'_, AppState>,
    id: i64,
    answer: crate::sm2::Answer,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalCard::update_based_on_answer(db, id, answer)
            .map(|msg| SuccessResponse::new(msg.clone(), msg))
            .map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn delete_normal_card(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalCard::delete(db, id)
            .map(|msg| SuccessResponse::new(msg.clone(), msg))
            .map_err(|e| e.to_string())
    })
    .await
}

// Backup and Restore Commands

fn get_db_path(app: &AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let db_path = app_data_dir.join("flashcodes.db");
    db_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid database path".to_string())
}

#[tauri::command]
pub async fn export_database_backup(
    state: State<'_, AppState>,
    destination_path: String,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let state_clone = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        // Acquire lock and enforce native session authorization
        let db_guard = state_clone.db.lock().map_err(|e| {
            eprintln!("Error locking database: {:?}", e);
            ErrorResponse::new("Failed to acquire database lock".into())
        })?;
        require_active_session(&db_guard).map_err(|e| ErrorResponse::new(e))?;

        let source_path = db_guard.get_active_db_path();

        // Validate source exists
        if !source_path.exists() {
            return Err(ErrorResponse::new("Database file not found".into()));
        }

        // Copy database file
        fs::copy(&source_path, &destination_path).map_err(|e| {
            eprintln!("Failed to copy database: {:?}", e);
            ErrorResponse::new(format!("Failed to export backup: {}", e))
        })?;

        Ok(SuccessResponse::new(
            "Database exported successfully".into(),
            destination_path.clone(),
        ))
    })
    .await
    .map_err(|e| {
        eprintln!("Task join error: {:?}", e);
        ErrorResponse::new("Export operation failed".into())
    })?
}

#[tauri::command]
pub async fn import_database_backup(
    state: State<'_, AppState>,
    source_path: String,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let state_clone = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        // Validate source exists
        if !Path::new(&source_path).exists() {
            return Err(ErrorResponse::new("Backup file not found".into()));
        }

        // Validate source is a valid SQLite database
        if let Err(e) = rusqlite::Connection::open(&source_path) {
            return Err(ErrorResponse::new(format!(
                "Invalid database file: {}",
                e
            )));
        }

        // Acquire lock and enforce native session authorization before any file operation
        let mut db_guard = state_clone.db.lock().map_err(|e| {
            eprintln!("Error locking database: {:?}", e);
            ErrorResponse::new("Failed to acquire database lock".into())
        })?;
        require_active_session(&db_guard).map_err(|e| ErrorResponse::new(e))?;

        let db_path = db_guard.get_active_db_path();

        // Create automatic backup of current database before replacing
        let timestamp = Local::now().format("%Y%m%d_%H%M%S");
        let backup_path = format!("{}.backup_{}", db_path.to_string_lossy(), timestamp);

        if db_path.exists() {
            fs::copy(&db_path, &backup_path).map_err(|e| {
                eprintln!("Failed to create safety backup: {:?}", e);
                ErrorResponse::new(format!("Failed to create safety backup: {}", e))
            })?;
        }

        // Copy backup file to database location
        fs::copy(&source_path, &db_path).map_err(|e| {
            eprintln!("Failed to import database: {:?}", e);
            // Try to restore from safety backup
            if Path::new(&backup_path).exists() {
                let _ = fs::copy(&backup_path, &db_path);
            }
            ErrorResponse::new(format!("Failed to import backup: {}", e))
        })?;

        // Reconnect and migrate the active user database
        if let Some(uid) = db_guard.current_user_id().map(|s| s.to_string()) {
            let _ = db_guard.switch_user(&uid);
        }

        Ok(SuccessResponse::new(
            "Database imported successfully. Please restart the application.".into(),
            backup_path,
        ))
    })
    .await
    .map_err(|e| {
        eprintln!("Task join error: {:?}", e);
        ErrorResponse::new("Import operation failed".into())
    })?
}

#[tauri::command]
pub async fn get_database_path(app: AppHandle) -> Result<SuccessResponse<String>, ErrorResponse> {
    tokio::task::spawn_blocking(move || {
        get_db_path(&app)
            .map(|path| SuccessResponse::new("Database path retrieved".into(), path))
            .map_err(|e| ErrorResponse::new(e))
    })
    .await
    .map_err(|e| {
        eprintln!("Task join error: {:?}", e);
        ErrorResponse::new("Failed to get database path".into())
    })?
}

#[tauri::command]
pub async fn read_database_backup_bytes(
    state: State<'_, AppState>,
) -> Result<SuccessResponse<Vec<u8>>, ErrorResponse> {
    let state_clone = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let db_guard = state_clone.db.lock().map_err(|e| {
            eprintln!("Error locking database Mutex: {:?}", e);
            ErrorResponse::new("Failed to acquire database lock".into())
        })?;
        require_active_session(&db_guard).map_err(|e| ErrorResponse::new(e))?;
        let bytes = db_guard.backup_to_bytes().map_err(|e| {
            eprintln!("Online backup error: {:?}", e);
            ErrorResponse::new(format!("Failed to take SQLite backup: {}", e))
        })?;
        Ok(SuccessResponse::new("Database backup bytes read successfully".into(), bytes))
    })
    .await
    .map_err(|e| {
        eprintln!("Task join error: {:?}", e);
        ErrorResponse::new("Failed to read database backup".into())
    })?
}

#[tauri::command]
pub async fn import_database_backup_bytes(
    state: State<'_, AppState>,
    bytes: Vec<u8>,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let state_clone = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut db_guard = state_clone.db.lock().map_err(|e| {
            eprintln!("Error locking database Mutex: {:?}", e);
            ErrorResponse::new("Failed to acquire database lock".into())
        })?;
        require_active_session(&db_guard).map_err(|e| ErrorResponse::new(e))?;
        let safety_path = db_guard.restore_from_bytes(&bytes).map_err(|e| {
            eprintln!("Restore error: {:?}", e);
            ErrorResponse::new(format!("Failed to restore SQLite database: {}", e))
        })?;
        Ok(SuccessResponse::new(
            "Database restored successfully".into(),
            safety_path,
        ))
    })
    .await
    .map_err(|e| {
        eprintln!("Task join error: {:?}", e);
        ErrorResponse::new("Import operation failed".into())
    })?
}

#[tauri::command]
pub async fn switch_user_database(
    state: State<'_, AppState>,
    user_id: String,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    // Validate against trusted native session: do not allow opening an arbitrary user's database
    let creds = crate::oauth::load_credentials()
        .map_err(|e| ErrorResponse::new(e))?
        .ok_or_else(|| ErrorResponse::new("No active session. Please sign in.".into()))?;

    if !crate::oauth::is_session_valid(&creds) {
        return Err(ErrorResponse::new("Session expired. Please sign in again.".into()));
    }

    if creds.user_id != user_id {
        return Err(ErrorResponse::new("Unauthorized: user ID does not match active session.".into()));
    }

    let state_clone = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut db_guard = state_clone.db.lock().map_err(|e| {
            eprintln!("Error locking database Mutex: {:?}", e);
            ErrorResponse::new("Failed to acquire database lock".into())
        })?;
        db_guard.switch_user(&user_id).map_err(|e| {
            eprintln!("Failed to switch user database: {:?}", e);
            ErrorResponse::new(format!("Failed to switch user database: {}", e))
        })?;
        let path = db_guard.get_active_db_path().to_string_lossy().to_string();
        Ok(SuccessResponse::new("Switched user database successfully".into(), path))
    })
    .await
    .map_err(|e| ErrorResponse::new(format!("Task join error: {}", e)))?
}

#[tauri::command]
pub async fn close_user_database(
    state: State<'_, AppState>,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let state_clone = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut db_guard = state_clone.db.lock().map_err(|e| {
            eprintln!("Error locking database Mutex: {:?}", e);
            ErrorResponse::new("Failed to acquire database lock".into())
        })?;
        db_guard.close_user().map_err(|e| {
            eprintln!("Failed to close user database: {:?}", e);
            ErrorResponse::new(format!("Failed to close user database: {}", e))
        })?;
        Ok(SuccessResponse::new("Closed user database successfully".into(), "default".into()))
    })
    .await
    .map_err(|e| ErrorResponse::new(format!("Task join error: {}", e)))?
}

#[tauri::command]
pub async fn start_google_login(
    app: AppHandle,
    state: State<'_, AppState>,
    client_id: String,
    duration_days: u32,
) -> Result<SuccessResponse<crate::oauth::OAuthResult>, ErrorResponse> {
    if !crate::oauth::ALLOWED_DURATIONS.contains(&duration_days) {
        return Err(ErrorResponse::new(format!(
            "Invalid session duration: {} days. Allowed: {:?}",
            duration_days, crate::oauth::ALLOWED_DURATIONS
        )));
    }

    let result = crate::oauth::perform_google_oauth(&app, &client_id, duration_days)
        .await
        .map_err(|e| ErrorResponse::new(e))?;

    // Switch database to the authenticated user. Must succeed or login fails.
    let user_id = result.id.clone();
    let state_clone = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut db_guard = state_clone.db.lock().map_err(|e| {
            ErrorResponse::new(format!("Failed to acquire database lock: {}", e))
        })?;
        db_guard.switch_user(&user_id).map_err(|e| {
            ErrorResponse::new(format!("Failed to prepare user database: {}", e))
        })?;
        Ok::<(), ErrorResponse>(())
    })
    .await
    .map_err(|e| ErrorResponse::new(format!("Database switch failed: {}", e)))??
    ;

    Ok(SuccessResponse::new("Authenticated successfully with Google".into(), result))
}

#[tauri::command]
pub async fn restore_auth_session(
    state: State<'_, AppState>,
) -> Result<SuccessResponse<crate::oauth::NativeSessionInfo>, ErrorResponse> {
    let session_info = crate::oauth::restore_session()
        .await
        .map_err(|e| ErrorResponse::new(e))?
        .ok_or_else(|| ErrorResponse::new("No active session found.".into()))?;

    // Verify user_id matches credential record (restore_session already does this
    // since it reads from the same credential record).
    // Now switch the database to this user.
    let user_id = session_info.user_id.clone();
    let state_clone = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut db_guard = state_clone.db.lock().map_err(|e| {
            ErrorResponse::new(format!("Failed to acquire database lock: {}", e))
        })?;
        db_guard.switch_user(&user_id).map_err(|e| {
            ErrorResponse::new(format!("Failed to prepare user database: {}", e))
        })?;
        Ok::<(), ErrorResponse>(())
    })
    .await
    .map_err(|e| ErrorResponse::new(format!("Database restoration failed: {}", e)))??
    ;

    Ok(SuccessResponse::new("Session restored successfully".into(), session_info))
}

#[tauri::command]
pub async fn update_session_duration(
    duration_days: u32,
) -> Result<SuccessResponse<crate::oauth::NativeSessionInfo>, ErrorResponse> {
    crate::oauth::update_session_duration(duration_days)
        .await
        .map(|info| SuccessResponse::new("Session duration updated".into(), info))
        .map_err(|e| ErrorResponse::new(e))
}

#[tauri::command]
pub async fn refresh_auth_session() -> Result<SuccessResponse<crate::oauth::NativeSessionInfo>, ErrorResponse> {
    crate::oauth::refresh_session()
        .await
        .map(|info| SuccessResponse::new("Session refreshed".into(), info))
        .map_err(|e| ErrorResponse::new(e))
}

#[tauri::command]
pub async fn get_secure_access_token() -> Result<SuccessResponse<Option<String>>, ErrorResponse> {
    match crate::oauth::get_valid_access_token().await {
        Ok(token) => Ok(SuccessResponse::new(
            "Retrieved access token".into(),
            Some(token),
        )),
        Err(e) => Err(ErrorResponse::new(e)),
    }
}

#[tauri::command]
pub async fn clear_secure_tokens(
    state: State<'_, AppState>,
) -> Result<SuccessResponse<()>, ErrorResponse> {
    crate::oauth::delete_credentials()
        .await
        .map_err(|e| ErrorResponse::new(e))?;

    // Close the user database and revert to default
    let state_clone = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut db_guard = state_clone.db.lock().map_err(|e| {
            ErrorResponse::new(format!("Failed to acquire database lock: {}", e))
        })?;
        db_guard.close_user().map_err(|e| {
            ErrorResponse::new(format!("Failed to close user database: {}", e))
        })?;
        Ok::<(), ErrorResponse>(())
    })
    .await
    .map_err(|e| ErrorResponse::new(format!("Database close failed: {}", e)))??
    ;

    Ok(SuccessResponse::new("Cleared secure tokens and closed user database".into(), ()))
}

#[tauri::command]
pub async fn force_refresh_access_token(
    stale_token: String,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    crate::oauth::force_refresh_access_token(&stale_token)
        .await
        .map(|token| SuccessResponse::new("Access token refreshed".into(), token))
        .map_err(|e| ErrorResponse::new(e))
}


// ===== Quiz Commands =====

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateQuizPayload {
    pub title: String,
    pub questions: Vec<CreateQuestionPayload>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateQuestionPayload {
    pub question_type: String,
    pub question_text: String,
    pub options: Vec<CreateOptionPayload>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOptionPayload {
    pub option_id: String,
    pub option_text: String,
    pub is_correct: bool,
}

#[tauri::command]
pub async fn create_quiz(
    state: State<'_, AppState>,
    payload: CreateQuizPayload,
) -> Result<SuccessResponse<QuizWithQuestions>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        let conn = db.get_connection();

        let quiz = Quiz::create(conn, &payload.title)?;

        let mut questions_with_options = Vec::new();

        for (index, question_payload) in payload.questions.iter().enumerate() {
            let question = QuizQuestion::create(
                conn,
                quiz.id,
                &question_payload.question_type,
                &question_payload.question_text,
                index as i64,
            )?;

            let mut options = Vec::new();
            for option_payload in &question_payload.options {
                let option = QuizOption::create(
                    conn,
                    question.id,
                    &option_payload.option_id,
                    &option_payload.option_text,
                    option_payload.is_correct,
                )?;
                options.push(option);
            }

            questions_with_options.push(QuizQuestion {
                options,
                ..question
            });
        }

        Ok(SuccessResponse::new(
            "Quiz created successfully".into(),
            QuizWithQuestions {
                quiz,
                questions: questions_with_options,
            },
        ))
    })
    .await
}

#[tauri::command]
pub async fn get_all_quizzes(
    state: State<'_, AppState>,
) -> Result<SuccessResponse<Vec<Quiz>>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        let conn = db.get_connection();
        Quiz::get_all(conn).map(|quizzes| SuccessResponse::new("Quizzes retrieved".into(), quizzes))
    })
    .await
}

#[tauri::command]
pub async fn get_quiz(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<QuizWithQuestions>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        let conn = db.get_connection();
        let quiz = Quiz::get(conn, id)?;
        let questions = QuizQuestion::get_by_quiz_id(conn, id)?;

        Ok(SuccessResponse::new(
            "Quiz retrieved".into(),
            QuizWithQuestions { quiz, questions },
        ))
    })
    .await
}

#[tauri::command]
pub async fn update_quiz(
    state: State<'_, AppState>,
    id: i64,
    payload: CreateQuizPayload,
) -> Result<SuccessResponse<QuizWithQuestions>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        let conn = db.get_connection();

        let quiz = Quiz::get(conn, id)?;
        let updated_quiz = Quiz {
            title: payload.title,
            ..quiz
        };
        updated_quiz.update(conn)?;

        let existing_questions = QuizQuestion::get_by_quiz_id(conn, id)?;
        for question in existing_questions {
            QuizOption::delete_by_question_id(conn, question.id)?;
            QuizQuestion::delete(conn, question.id)?;
        }

        let mut questions_with_options = Vec::new();
        for (index, question_payload) in payload.questions.iter().enumerate() {
            let question = QuizQuestion::create(
                conn,
                id,
                &question_payload.question_type,
                &question_payload.question_text,
                index as i64,
            )?;

            let mut options = Vec::new();
            for option_payload in &question_payload.options {
                let option = QuizOption::create(
                    conn,
                    question.id,
                    &option_payload.option_id,
                    &option_payload.option_text,
                    option_payload.is_correct,
                )?;
                options.push(option);
            }

            questions_with_options.push(QuizQuestion {
                options,
                ..question
            });
        }

        let final_quiz = Quiz::get(conn, id)?;

        Ok(SuccessResponse::new(
            "Quiz updated successfully".into(),
            QuizWithQuestions {
                quiz: final_quiz,
                questions: questions_with_options,
            },
        ))
    })
    .await
}

#[tauri::command]
pub async fn delete_quiz(
    state: State<'_, AppState>,
    id: i64,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        let conn = db.get_connection();
        Quiz::delete(conn, id)
            .map(|msg| SuccessResponse::new(msg.clone(), format!("Quiz with id {} deleted", id)))
    })
    .await
}

#[tauri::command]
pub async fn import_quiz_from_json(
    state: State<'_, AppState>,
    json_data: String,
) -> Result<SuccessResponse<QuizWithQuestions>, ErrorResponse> {
    let payload: CreateQuizPayload = serde_json::from_str(&json_data)
        .map_err(|e| ErrorResponse::new(format!("Invalid JSON format: {}", e)))?;

    create_quiz(state, payload).await
}
