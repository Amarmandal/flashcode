mod commands;
mod database;
mod models;
mod queues;
mod responses;
mod sm2;

use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder}};

use commands::{
    answer_flashcard, create_deck, create_flashcode, delete_deck, delete_flashcode, get_all_decks,
    get_deck, get_flashcard_counts, get_flashcode, get_flashcodes_by_deck, get_queues_for_today,
    reset_deck, search, update_deck, update_flashcode, AppState,
    create_snippet, get_snippet, get_all_snippets, update_snippet, delete_snippet, search_snippets,
    create_snippet_folder, get_snippet_folders, delete_snippet_folder,
    create_normal_deck, get_all_normal_decks, get_normal_deck, update_normal_deck, delete_normal_deck,
    reset_normal_deck, create_normal_card, get_normal_cards_by_deck, get_normal_queues_for_today,
    answer_normal_card, delete_normal_card,
    export_database_backup, import_database_backup, get_database_path,
};
use database::DatabaseConnection;
use models::{seconds_to_days, Flashcode};
use queues::{build_queues, merge_queues};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let db = DatabaseConnection::new(&app_handle).unwrap();
            app.manage(AppState { db: Arc::new(Mutex::new(db)) });

            // Build the native menu

            // App Menu (Flash Code)
            let app_menu = SubmenuBuilder::new(app, "Flash Code")
                .about(None)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // File Menu
            let export_backup = MenuItemBuilder::with_id("export_backup", "Export Backup...")
                .accelerator("CmdOrCtrl+Shift+E")
                .build(app)?;
            let import_backup = MenuItemBuilder::with_id("import_backup", "Import Backup...")
                .accelerator("CmdOrCtrl+Shift+I")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&export_backup)
                .item(&import_backup)
                .separator()
                .close_window()
                .quit()
                .build()?;

            // Edit Menu
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .separator()
                .select_all()
                .build()?;

            // View Menu
            let view_menu = SubmenuBuilder::new(app, "View")
                .fullscreen()
                .build()?;

            // Window Menu
            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .maximize()
                .separator()
                .close_window()
                .build()?;

            // Help Menu
            let help_menu = SubmenuBuilder::new(app, "Help")
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(move |app, event| {
                match event.id().as_ref() {
                    "export_backup" => {
                        let _ = app.emit("menu://export-backup", ());
                    }
                    "import_backup" => {
                        let _ = app.emit("menu://import-backup", ());
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())        .invoke_handler(tauri::generate_handler![
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
            answer_flashcard,
            get_queues_for_today,
            get_flashcard_counts,
            reset_deck,
            search,
            create_snippet,
            get_snippet,
            get_all_snippets,
            update_snippet,
            delete_snippet,
            search_snippets,
            create_snippet_folder,
            get_snippet_folders,
            delete_snippet_folder,
            create_normal_deck,
            get_all_normal_decks,
            get_normal_deck,
            update_normal_deck,
            delete_normal_deck,
            reset_normal_deck,
            create_normal_card,
            get_normal_cards_by_deck,
            get_normal_queues_for_today,
            answer_normal_card,
            delete_normal_card,
            export_database_backup,
            import_database_backup,
            get_database_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
