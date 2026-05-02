use std::sync::{Arc, Mutex};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager, State};
use v_htmlescape::escape;
use chrono::Local;

use crate::database::DatabaseConnection;
use crate::models::{
    Deck, DeckQueryParams, Flashcode, NormalCard, NormalDeck, NormalQueuesResponse, SearchResult,
    Snippet, SnippetFolder, SnippetQueryParams,
};
use crate::responses::{
    DeckWithCount, ErrorResponse, SuccessResponse, SuccessResponseWithCount, TodayQueuesResponse,
};
use crate::sm2::Answer;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<DatabaseConnection>>,
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
) -> Result<SuccessResponse<NormalCard>, ErrorResponse> {
    run_db_operation(&state.db, move |db| {
        NormalCard::create(db, deck_id, &front, &back)
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
    app: AppHandle,
    destination_path: String,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    tokio::task::spawn_blocking(move || {
        let source_path = get_db_path(&app).map_err(|e| ErrorResponse::new(e))?;

        // Validate source exists
        if !Path::new(&source_path).exists() {
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
    app: AppHandle,
    state: State<'_, AppState>,
    source_path: String,
) -> Result<SuccessResponse<String>, ErrorResponse> {
    let state_clone = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let db_path = get_db_path(&app).map_err(|e| ErrorResponse::new(e))?;

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

        // Create automatic backup of current database before replacing
        let timestamp = Local::now().format("%Y%m%d_%H%M%S");
        let backup_path = format!("{}.backup_{}", db_path, timestamp);

        if Path::new(&db_path).exists() {
            fs::copy(&db_path, &backup_path).map_err(|e| {
                eprintln!("Failed to create safety backup: {:?}", e);
                ErrorResponse::new(format!("Failed to create safety backup: {}", e))
            })?;
        }

        // Acquire lock to ensure no operations are in progress
        let _db_guard = state_clone.db.lock().map_err(|e| {
            eprintln!("Error locking database: {:?}", e);
            ErrorResponse::new("Failed to acquire database lock".into())
        })?;

        // Copy backup file to database location
        fs::copy(&source_path, &db_path).map_err(|e| {
            eprintln!("Failed to import database: {:?}", e);
            // Try to restore from safety backup
            if Path::new(&backup_path).exists() {
                let _ = fs::copy(&backup_path, &db_path);
            }
            ErrorResponse::new(format!("Failed to import backup: {}", e))
        })?;

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
