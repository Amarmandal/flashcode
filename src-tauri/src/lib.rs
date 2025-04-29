mod commands;
mod database;
mod models;
mod responses;
mod sm2;

use std::sync::Mutex;
use tauri::Manager;

use commands::{
    create_deck, create_flashcode, delete_deck, delete_flashcode, get_all_decks, get_deck,
    get_flashcode, get_flashcodes_by_deck, update_deck, update_flashcode, AppState,
};
use database::DatabaseConnection;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let db = DatabaseConnection::new(&app_handle).unwrap();
            app.manage(AppState { db: Mutex::new(db) });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            create_deck,
            get_deck,
            delete_deck,
            get_all_decks,
            update_deck,
            create_flashcode,
            get_flashcode,
            delete_flashcode,
            update_flashcode,
            get_flashcodes_by_deck,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
