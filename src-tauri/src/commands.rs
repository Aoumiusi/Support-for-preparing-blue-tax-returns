use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db;
use crate::models::*;

pub struct DbState(pub Mutex<Connection>);

// ── 勘定科目 ──

#[tauri::command]
pub fn get_accounts(state: State<DbState>) -> Result<Vec<Account>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::fetch_accounts(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_account(
    state: State<DbState>,
    code: i32,
    name: String,
    classification: String,
) -> Result<Account, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::insert_account(&conn, code, &name, &classification).map_err(|e| e.to_string())
}

// ── 仕訳 ──

#[tauri::command]
pub fn add_entry(
    state: State<DbState>,
    date: String,
    debit_account_id: i64,
    debit_amount: i64,
    credit_account_id: i64,
    credit_amount: i64,
    description: String,
) -> Result<i64, String> {
    if debit_amount != credit_amount {
        return Err("借方金額と貸方金額が一致しません".to_string());
    }
    if debit_amount <= 0 {
        return Err("金額は1円以上を入力してください".to_string());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::insert_entry(&conn, &date, debit_account_id, debit_amount, credit_account_id, credit_amount, &description)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_entries(
    state: State<DbState>,
    year: i32,
    month: Option<i32>,
) -> Result<Vec<JournalEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::fetch_entries(&conn, year, month).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_entry(
    state: State<DbState>,
    id: i64,
    date: String,
    debit_account_id: i64,
    debit_amount: i64,
    credit_account_id: i64,
    credit_amount: i64,
    description: String,
) -> Result<(), String> {
    if debit_amount != credit_amount {
        return Err("借方金額と貸方金額が一致しません".to_string());
    }
    if debit_amount <= 0 {
        return Err("金額は1円以上を入力してください".to_string());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::update_entry(&conn, id, &date, debit_account_id, debit_amount, credit_account_id, credit_amount, &description)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_entry(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::delete_entry(&conn, id).map_err(|e| e.to_string())?;
    Ok(())
}

// ── 集計・レポート ──

#[tauri::command]
pub fn get_trial_balance(
    state: State<DbState>,
    year: i32,
    month: Option<i32>,
) -> Result<TrialBalance, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::calc_trial_balance(&conn, year, month).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_profit_loss(state: State<DbState>, year: i32) -> Result<ProfitLoss, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::calc_profit_loss(&conn, year).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_balance_sheet(state: State<DbState>, year: i32) -> Result<BalanceSheet, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::calc_balance_sheet(&conn, year).map_err(|e| e.to_string())
}

// ── 固定資産 ──

#[tauri::command]
pub fn get_fixed_assets(state: State<DbState>) -> Result<Vec<FixedAsset>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::fetch_fixed_assets(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_fixed_asset(
    state: State<DbState>,
    name: String,
    acquisition_date: String,
    acquisition_cost: i64,
    useful_life: i32,
    depreciation_method: String,
    depreciation_rate: i32,
    accumulated_dep: i64,
    memo: String,
) -> Result<i64, String> {
    if acquisition_cost <= 0 {
        return Err("取得価額は1円以上を入力してください".to_string());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::insert_fixed_asset(
        &conn, &name, &acquisition_date, acquisition_cost, useful_life,
        &depreciation_method, depreciation_rate, accumulated_dep, &memo,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_fixed_asset(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::delete_fixed_asset(&conn, id).map_err(|e| e.to_string())?;
    Ok(())
}

// ── 地代家賃内訳 ──

#[tauri::command]
pub fn get_rent_details(state: State<DbState>) -> Result<Vec<RentDetail>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::fetch_rent_details(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_rent_detail(
    state: State<DbState>,
    payee_address: String,
    payee_name: String,
    rent_type: String,
    monthly_rent: i64,
    annual_total: i64,
    business_ratio: i32,
    memo: String,
) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::insert_rent_detail(
        &conn, &payee_address, &payee_name, &rent_type,
        monthly_rent, annual_total, business_ratio, &memo,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_rent_detail(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::delete_rent_detail(&conn, id).map_err(|e| e.to_string())?;
    Ok(())
}

// ── 純損失の繰越控除 ──

#[tauri::command]
pub fn get_loss_carryforwards(state: State<DbState>) -> Result<Vec<LossCarryforward>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::fetch_loss_carryforwards(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_loss_carryforward(
    state: State<DbState>,
    loss_year: i32,
    loss_amount: i64,
    memo: String,
) -> Result<i64, String> {
    if loss_amount <= 0 {
        return Err("繰越損失額は1円以上を入力してください".to_string());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::insert_loss_carryforward(&conn, loss_year, loss_amount, &memo)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_loss_carryforward(
    state: State<DbState>,
    id: i64,
    used_year_1: i64,
    used_year_2: i64,
    used_year_3: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::update_loss_carryforward_usage(&conn, id, used_year_1, used_year_2, used_year_3)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_loss_carryforward(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::delete_loss_carryforward(&conn, id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_loss_carryforward_summary(
    state: State<DbState>,
    year: i32,
) -> Result<LossCarryforwardSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::calc_loss_carryforward(&conn, year).map_err(|e| e.to_string())
}

// ── 青色申告決算書（統合） ──

#[tauri::command]
pub fn get_final_statement(state: State<DbState>, year: i32) -> Result<FinalStatement, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::calc_final_statement(&conn, year).map_err(|e| e.to_string())
}

// ── CSV エクスポート ──

#[tauri::command]
pub fn export_journal_csv(
    state: State<DbState>,
    year: i32,
    month: Option<i32>,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let entries = db::fetch_entries(&conn, year, month).map_err(|e| e.to_string())?;

    let mut wtr = csv::Writer::from_writer(Vec::new());
    wtr.write_record(["日付", "借方科目", "借方金額", "貸方科目", "貸方金額", "摘要"])
        .map_err(|e| e.to_string())?;

    for entry in &entries {
        wtr.write_record([
            &entry.date,
            entry.debit_account_name.as_deref().unwrap_or(""),
            &entry.debit_amount.to_string(),
            entry.credit_account_name.as_deref().unwrap_or(""),
            &entry.credit_amount.to_string(),
            &entry.description,
        ])
        .map_err(|e| e.to_string())?;
    }

    let data = wtr.into_inner().map_err(|e| e.to_string())?;
    // BOM + UTF-8 for Excel compatibility
    let bom = "\u{FEFF}";
    let csv_string = format!("{}{}", bom, String::from_utf8(data).map_err(|e| e.to_string())?);
    Ok(csv_string)
}

// ── バックアップ ──

#[tauri::command]
pub fn backup_database(app_handle: tauri::AppHandle) -> Result<String, String> {
    let db_path = db::get_db_path(&app_handle);
    let now = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("tauri-blue_backup_{}.db", now);

    let desktop = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or("failed to resolve app data dir")?;
    let backup_path = desktop.join(&backup_name);

    std::fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;

    Ok(backup_path.to_string_lossy().to_string())
}
