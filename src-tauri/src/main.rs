#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod db;
mod models;

use commands::DbState;
use std::sync::Mutex;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = db::get_db_path(&app.handle());
            let conn = db::init_db(&db_path).expect("failed to initialize database");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_accounts,
            commands::add_account,
            commands::add_entry,
            commands::get_entries,
            commands::update_entry,
            commands::delete_entry,
            commands::get_trial_balance,
            commands::get_profit_loss,
            commands::get_balance_sheet,
            commands::get_fixed_assets,
            commands::add_fixed_asset,
            commands::delete_fixed_asset,
            commands::get_rent_details,
            commands::add_rent_detail,
            commands::delete_rent_detail,
            commands::get_loss_carryforwards,
            commands::add_loss_carryforward,
            commands::update_loss_carryforward,
            commands::delete_loss_carryforward,
            commands::get_loss_carryforward_summary,
            commands::get_final_statement,
            commands::export_journal_csv,
            commands::backup_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
