use rusqlite::{params, Connection, Result as SqlResult};
use std::path::PathBuf;

use crate::models::*;

const MIGRATION_SQL: &str = include_str!("../migrations/001_init.sql");

pub fn get_db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    app_dir.join("tauri-blue.db")
}

pub fn init_db(path: &PathBuf) -> SqlResult<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    conn.execute_batch(MIGRATION_SQL)?;
    Ok(conn)
}

// ── 勘定科目 ──

pub fn fetch_accounts(conn: &Connection) -> SqlResult<Vec<Account>> {
    let mut stmt = conn.prepare(
        "SELECT id, code, name, classification FROM accounts ORDER BY code",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Account {
            id: row.get(0)?,
            code: row.get(1)?,
            name: row.get(2)?,
            classification: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn insert_account(
    conn: &Connection,
    code: i32,
    name: &str,
    classification: &str,
) -> SqlResult<Account> {
    conn.execute(
        "INSERT INTO accounts (code, name, classification) VALUES (?1, ?2, ?3)",
        params![code, name, classification],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Account {
        id,
        code,
        name: name.to_string(),
        classification: classification.to_string(),
    })
}

// ── 仕訳 ──

pub fn insert_entry(
    conn: &Connection,
    date: &str,
    debit_account_id: i64,
    debit_amount: i64,
    credit_account_id: i64,
    credit_amount: i64,
    description: &str,
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO journal_entries (date, debit_account_id, debit_amount, credit_account_id, credit_amount, description)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![date, debit_account_id, debit_amount, credit_account_id, credit_amount, description],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn fetch_entries(conn: &Connection, year: i32, month: Option<i32>) -> SqlResult<Vec<JournalEntry>> {
    let (sql, params_vec): (&str, Vec<Box<dyn rusqlite::types::ToSql>>) = match month {
        Some(m) => (
            "SELECT j.id, j.date, j.debit_account_id, da.name, j.debit_amount,
                    j.credit_account_id, ca.name, j.credit_amount, j.description, j.created_at
             FROM journal_entries j
             JOIN accounts da ON da.id = j.debit_account_id
             JOIN accounts ca ON ca.id = j.credit_account_id
             WHERE j.date >= ?1 AND j.date <= ?2
             ORDER BY j.date, j.id",
            vec![
                Box::new(format!("{:04}-{:02}-01", year, m)),
                Box::new(format!("{:04}-{:02}-31", year, m)),
            ],
        ),
        None => (
            "SELECT j.id, j.date, j.debit_account_id, da.name, j.debit_amount,
                    j.credit_account_id, ca.name, j.credit_amount, j.description, j.created_at
             FROM journal_entries j
             JOIN accounts da ON da.id = j.debit_account_id
             JOIN accounts ca ON ca.id = j.credit_account_id
             WHERE j.date >= ?1 AND j.date <= ?2
             ORDER BY j.date, j.id",
            vec![
                Box::new(format!("{:04}-01-01", year)),
                Box::new(format!("{:04}-12-31", year)),
            ],
        ),
    };

    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(JournalEntry {
            id: row.get(0)?,
            date: row.get(1)?,
            debit_account_id: row.get(2)?,
            debit_account_name: row.get(3)?,
            debit_amount: row.get(4)?,
            credit_account_id: row.get(5)?,
            credit_account_name: row.get(6)?,
            credit_amount: row.get(7)?,
            description: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    rows.collect()
}

pub fn update_entry(
    conn: &Connection,
    id: i64,
    date: &str,
    debit_account_id: i64,
    debit_amount: i64,
    credit_account_id: i64,
    credit_amount: i64,
    description: &str,
) -> SqlResult<usize> {
    conn.execute(
        "UPDATE journal_entries
         SET date = ?1, debit_account_id = ?2, debit_amount = ?3,
             credit_account_id = ?4, credit_amount = ?5, description = ?6
         WHERE id = ?7",
        params![date, debit_account_id, debit_amount, credit_account_id, credit_amount, description, id],
    )
}

pub fn delete_entry(conn: &Connection, id: i64) -> SqlResult<usize> {
    conn.execute("DELETE FROM journal_entries WHERE id = ?1", params![id])
}

// ── 集計 ──

pub fn calc_trial_balance(conn: &Connection, year: i32, month: Option<i32>) -> SqlResult<TrialBalance> {
    let (date_from, date_to) = match month {
        Some(m) => (format!("{:04}-{:02}-01", year, m), format!("{:04}-{:02}-31", year, m)),
        None => (format!("{:04}-01-01", year), format!("{:04}-12-31", year)),
    };

    let sql = "
        SELECT a.id, a.code, a.name, a.classification,
               COALESCE(SUM(CASE WHEN j.debit_account_id = a.id THEN j.debit_amount ELSE 0 END), 0) AS debit_total,
               COALESCE(SUM(CASE WHEN j.credit_account_id = a.id THEN j.credit_amount ELSE 0 END), 0) AS credit_total
        FROM accounts a
        LEFT JOIN journal_entries j ON (j.debit_account_id = a.id OR j.credit_account_id = a.id)
            AND j.date >= ?1 AND j.date <= ?2
        GROUP BY a.id
        HAVING debit_total > 0 OR credit_total > 0
        ORDER BY a.code";

    let mut stmt = conn.prepare(sql)?;
    let rows: Vec<TrialBalanceRow> = stmt
        .query_map(params![date_from, date_to], |row| {
            let debit_total: i64 = row.get(4)?;
            let credit_total: i64 = row.get(5)?;
            let classification: String = row.get(3)?;
            let balance = match classification.as_str() {
                "資産" | "費用" => debit_total - credit_total,
                _ => credit_total - debit_total,
            };
            Ok(TrialBalanceRow {
                account_id: row.get(0)?,
                account_code: row.get(1)?,
                account_name: row.get(2)?,
                classification,
                debit_total,
                credit_total,
                balance,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    let debit_grand_total = rows.iter().map(|r| r.debit_total).sum();
    let credit_grand_total = rows.iter().map(|r| r.credit_total).sum();

    Ok(TrialBalance {
        rows,
        debit_grand_total,
        credit_grand_total,
    })
}

pub fn calc_profit_loss(conn: &Connection, year: i32) -> SqlResult<ProfitLoss> {
    let date_from = format!("{:04}-01-01", year);
    let date_to = format!("{:04}-12-31", year);

    let sql = "
        SELECT a.id, a.code, a.name, a.classification,
               COALESCE(SUM(CASE WHEN j.debit_account_id = a.id THEN j.debit_amount ELSE 0 END), 0) AS debit_total,
               COALESCE(SUM(CASE WHEN j.credit_account_id = a.id THEN j.credit_amount ELSE 0 END), 0) AS credit_total
        FROM accounts a
        LEFT JOIN journal_entries j ON (j.debit_account_id = a.id OR j.credit_account_id = a.id)
            AND j.date >= ?1 AND j.date <= ?2
        WHERE a.classification IN ('収益', '費用')
        GROUP BY a.id
        HAVING debit_total > 0 OR credit_total > 0
        ORDER BY a.code";

    let mut stmt = conn.prepare(sql)?;
    let all_rows: Vec<(i64, i32, String, String, i64, i64)> = stmt
        .query_map(params![date_from, date_to], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    let mut revenue_rows = Vec::new();
    let mut expense_rows = Vec::new();

    for (id, code, name, classification, debit_total, credit_total) in all_rows {
        let amount = match classification.as_str() {
            "収益" => credit_total - debit_total,
            "費用" => debit_total - credit_total,
            _ => 0,
        };
        let row = ProfitLossRow {
            account_id: id,
            account_code: code,
            account_name: name,
            amount,
        };
        match classification.as_str() {
            "収益" => revenue_rows.push(row),
            "費用" => expense_rows.push(row),
            _ => {}
        }
    }

    let total_revenue: i64 = revenue_rows.iter().map(|r| r.amount).sum();
    let total_expense: i64 = expense_rows.iter().map(|r| r.amount).sum();

    Ok(ProfitLoss {
        revenue_rows,
        expense_rows,
        total_revenue,
        total_expense,
        net_income: total_revenue - total_expense,
    })
}

pub fn calc_balance_sheet(conn: &Connection, year: i32) -> SqlResult<BalanceSheet> {
    let date_from = format!("{:04}-01-01", year);
    let date_to = format!("{:04}-12-31", year);

    let sql = "
        SELECT a.id, a.code, a.name, a.classification,
               COALESCE(SUM(CASE WHEN j.debit_account_id = a.id THEN j.debit_amount ELSE 0 END), 0) AS debit_total,
               COALESCE(SUM(CASE WHEN j.credit_account_id = a.id THEN j.credit_amount ELSE 0 END), 0) AS credit_total
        FROM accounts a
        LEFT JOIN journal_entries j ON (j.debit_account_id = a.id OR j.credit_account_id = a.id)
            AND j.date >= ?1 AND j.date <= ?2
        WHERE a.classification IN ('資産', '負債', '純資産')
        GROUP BY a.id
        HAVING debit_total > 0 OR credit_total > 0
        ORDER BY a.code";

    let mut stmt = conn.prepare(sql)?;
    let all_rows: Vec<(i64, i32, String, String, i64, i64)> = stmt
        .query_map(params![date_from, date_to], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    let mut asset_rows = Vec::new();
    let mut liability_rows = Vec::new();
    let mut equity_rows = Vec::new();

    for (id, code, name, classification, debit_total, credit_total) in all_rows {
        let amount = match classification.as_str() {
            "資産" => debit_total - credit_total,
            _ => credit_total - debit_total,
        };
        let row = BalanceSheetRow {
            account_id: id,
            account_code: code,
            account_name: name,
            amount,
        };
        match classification.as_str() {
            "資産" => asset_rows.push(row),
            "負債" => liability_rows.push(row),
            "純資産" => equity_rows.push(row),
            _ => {}
        }
    }

    let total_assets: i64 = asset_rows.iter().map(|r| r.amount).sum();
    let total_liabilities: i64 = liability_rows.iter().map(|r| r.amount).sum();
    let total_equity: i64 = equity_rows.iter().map(|r| r.amount).sum();

    let pl = calc_profit_loss(conn, year)?;

    Ok(BalanceSheet {
        asset_rows,
        liability_rows,
        equity_rows,
        total_assets,
        total_liabilities,
        total_equity,
        net_income: pl.net_income,
    })
}
