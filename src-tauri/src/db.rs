use rusqlite::{params, Connection, Result as SqlResult};
use std::path::PathBuf;

use crate::models::*;

const MIGRATION_001: &str = include_str!("../migrations/001_init.sql");
const MIGRATION_002: &str = include_str!("../migrations/002_financial_statements.sql");
const MIGRATION_003: &str = include_str!("../migrations/003_loss_carryforward.sql");

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
    conn.execute_batch(MIGRATION_001)?;
    conn.execute_batch(MIGRATION_002)?;
    conn.execute_batch(MIGRATION_003)?;
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

// ── 固定資産 ──

pub fn fetch_fixed_assets(conn: &Connection) -> SqlResult<Vec<FixedAsset>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, acquisition_date, acquisition_cost, useful_life,
                depreciation_method, depreciation_rate, accumulated_dep, memo, is_active
         FROM fixed_assets ORDER BY acquisition_date",
    )?;
    let rows = stmt.query_map([], |row| {
        let active_flag: i32 = row.get(9)?;
        Ok(FixedAsset {
            id: row.get(0)?,
            name: row.get(1)?,
            acquisition_date: row.get(2)?,
            acquisition_cost: row.get(3)?,
            useful_life: row.get(4)?,
            depreciation_method: row.get(5)?,
            depreciation_rate: row.get(6)?,
            accumulated_dep: row.get(7)?,
            memo: row.get(8)?,
            is_active: active_flag != 0,
        })
    })?;
    rows.collect()
}

pub fn insert_fixed_asset(
    conn: &Connection,
    name: &str,
    acquisition_date: &str,
    acquisition_cost: i64,
    useful_life: i32,
    depreciation_method: &str,
    depreciation_rate: i32,
    accumulated_dep: i64,
    memo: &str,
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO fixed_assets (name, acquisition_date, acquisition_cost, useful_life,
                depreciation_method, depreciation_rate, accumulated_dep, memo)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![name, acquisition_date, acquisition_cost, useful_life,
                depreciation_method, depreciation_rate, accumulated_dep, memo],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn delete_fixed_asset(conn: &Connection, id: i64) -> SqlResult<usize> {
    conn.execute("DELETE FROM fixed_assets WHERE id = ?1", params![id])
}

/// 当期の減価償却費を計算する
pub fn calc_depreciation(conn: &Connection, year: i32) -> SqlResult<Vec<DepreciationRow>> {
    let assets = fetch_fixed_assets(conn)?;
    let mut rows = Vec::new();

    for asset in assets {
        if !asset.is_active {
            continue;
        }
        // 取得年を判定し、取得初年度の月割り計算
        let acq_year: i32 = asset.acquisition_date[..4].parse().unwrap_or(year);
        let acq_month: i32 = asset.acquisition_date[5..7].parse().unwrap_or(1);

        // 取得年より前の年度は対象外
        if year < acq_year {
            continue;
        }

        let remaining = asset.acquisition_cost - asset.accumulated_dep;
        if remaining <= 1 {
            // 備忘価額（1円）到達済み
            continue;
        }

        // 定額法: 取得価額 × 償却率 (depreciation_rate は ×10000)
        let mut dep = (asset.acquisition_cost as i128 * asset.depreciation_rate as i128 / 10000) as i64;

        // 取得初年度は月割り（取得月から12月までの月数 / 12）
        if year == acq_year {
            let months = 12 - acq_month + 1;
            dep = dep * months as i64 / 12;
        }

        // 備忘価額1円を残す
        if asset.accumulated_dep + dep >= asset.acquisition_cost {
            dep = asset.acquisition_cost - asset.accumulated_dep - 1;
        }
        if dep < 0 {
            dep = 0;
        }

        let accumulated_end = asset.accumulated_dep + dep;
        let book_value_end = asset.acquisition_cost - accumulated_end;

        rows.push(DepreciationRow {
            asset_id: asset.id,
            asset_name: asset.name,
            acquisition_date: asset.acquisition_date,
            acquisition_cost: asset.acquisition_cost,
            depreciation_method: asset.depreciation_method,
            useful_life: asset.useful_life,
            depreciation_rate: asset.depreciation_rate,
            accumulated_dep_prev: asset.accumulated_dep,
            current_year_dep: dep,
            accumulated_dep_end: accumulated_end,
            book_value_end,
        });
    }
    Ok(rows)
}

// ── 地代家賃内訳 ──

pub fn fetch_rent_details(conn: &Connection) -> SqlResult<Vec<RentDetail>> {
    let mut stmt = conn.prepare(
        "SELECT id, payee_address, payee_name, rent_type, monthly_rent,
                annual_total, business_ratio, memo
         FROM rent_details ORDER BY id",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(RentDetail {
            id: row.get(0)?,
            payee_address: row.get(1)?,
            payee_name: row.get(2)?,
            rent_type: row.get(3)?,
            monthly_rent: row.get(4)?,
            annual_total: row.get(5)?,
            business_ratio: row.get(6)?,
            memo: row.get(7)?,
        })
    })?;
    rows.collect()
}

pub fn insert_rent_detail(
    conn: &Connection,
    payee_address: &str,
    payee_name: &str,
    rent_type: &str,
    monthly_rent: i64,
    annual_total: i64,
    business_ratio: i32,
    memo: &str,
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO rent_details (payee_address, payee_name, rent_type, monthly_rent,
                annual_total, business_ratio, memo)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![payee_address, payee_name, rent_type, monthly_rent, annual_total, business_ratio, memo],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn delete_rent_detail(conn: &Connection, id: i64) -> SqlResult<usize> {
    conn.execute("DELETE FROM rent_details WHERE id = ?1", params![id])
}

// ── 月別売上・仕入 ──

pub fn calc_monthly_sales_purchases(conn: &Connection, year: i32) -> SqlResult<Vec<MonthlySalesPurchase>> {
    // 売上 = 貸方に売上高(4100)が使われた仕訳の金額
    // 仕入 = 借方に仕入高(5100)が使われた仕訳の金額
    let sql = "
        SELECT
            CAST(substr(j.date, 6, 2) AS INTEGER) AS month,
            COALESCE(SUM(CASE WHEN ca.code = 4100 THEN j.credit_amount ELSE 0 END), 0) AS sales,
            COALESCE(SUM(CASE WHEN da.code = 5100 THEN j.debit_amount ELSE 0 END), 0) AS purchases
        FROM journal_entries j
        JOIN accounts da ON da.id = j.debit_account_id
        JOIN accounts ca ON ca.id = j.credit_account_id
        WHERE j.date >= ?1 AND j.date <= ?2
        GROUP BY month
        ORDER BY month";

    let date_from = format!("{:04}-01-01", year);
    let date_to = format!("{:04}-12-31", year);

    let mut stmt = conn.prepare(sql)?;
    let existing: Vec<MonthlySalesPurchase> = stmt
        .query_map(params![date_from, date_to], |row| {
            Ok(MonthlySalesPurchase {
                month: row.get(0)?,
                sales: row.get(1)?,
                purchases: row.get(2)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    // 12ヶ月分を埋める
    let mut result: Vec<MonthlySalesPurchase> = (1..=12)
        .map(|m| {
            existing
                .iter()
                .find(|r| r.month == m)
                .cloned()
                .unwrap_or(MonthlySalesPurchase { month: m, sales: 0, purchases: 0 })
        })
        .collect();
    // result は必ず12要素
    let _ = &mut result; // suppress unused warning
    Ok(result)
}

// ── 純損失の繰越控除 ──

pub fn fetch_loss_carryforwards(conn: &Connection) -> SqlResult<Vec<LossCarryforward>> {
    let mut stmt = conn.prepare(
        "SELECT id, loss_year, loss_amount, used_year_1, used_year_2, used_year_3, memo
         FROM loss_carryforward ORDER BY loss_year",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(LossCarryforward {
            id: row.get(0)?,
            loss_year: row.get(1)?,
            loss_amount: row.get(2)?,
            used_year_1: row.get(3)?,
            used_year_2: row.get(4)?,
            used_year_3: row.get(5)?,
            memo: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn insert_loss_carryforward(
    conn: &Connection,
    loss_year: i32,
    loss_amount: i64,
    memo: &str,
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO loss_carryforward (loss_year, loss_amount, memo)
         VALUES (?1, ?2, ?3)",
        params![loss_year, loss_amount, memo],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_loss_carryforward_usage(
    conn: &Connection,
    id: i64,
    used_year_1: i64,
    used_year_2: i64,
    used_year_3: i64,
) -> SqlResult<usize> {
    conn.execute(
        "UPDATE loss_carryforward SET used_year_1 = ?1, used_year_2 = ?2, used_year_3 = ?3
         WHERE id = ?4",
        params![used_year_1, used_year_2, used_year_3, id],
    )
}

pub fn delete_loss_carryforward(conn: &Connection, id: i64) -> SqlResult<usize> {
    conn.execute("DELETE FROM loss_carryforward WHERE id = ?1", params![id])
}

/// 当期（target_year）に適用可能な繰越損失を計算する
/// 青色申告の場合、過去3年分の純損失を当期の所得から控除できる
pub fn calc_loss_carryforward(conn: &Connection, year: i32) -> SqlResult<LossCarryforwardSummary> {
    let pl = calc_profit_loss(conn, year)?;
    let income_before = pl.net_income;

    // 所得が0以下なら繰越控除の適用なし
    if income_before <= 0 {
        return Ok(LossCarryforwardSummary {
            rows: Vec::new(),
            total_applied: 0,
            income_before,
            income_after: income_before,
        });
    }

    // 過去3年分の繰越損失を取得（古い年度から順に控除）
    let mut stmt = conn.prepare(
        "SELECT id, loss_year, loss_amount, used_year_1, used_year_2, used_year_3, memo
         FROM loss_carryforward
         WHERE loss_year >= ?1 AND loss_year <= ?2
         ORDER BY loss_year",
    )?;
    let losses: Vec<LossCarryforward> = stmt
        .query_map(params![year - 3, year - 1], |row| {
            Ok(LossCarryforward {
                id: row.get(0)?,
                loss_year: row.get(1)?,
                loss_amount: row.get(2)?,
                used_year_1: row.get(3)?,
                used_year_2: row.get(4)?,
                used_year_3: row.get(5)?,
                memo: row.get(6)?,
            })
        })?
        .collect::<SqlResult<Vec<_>>>()?;

    let mut remaining_income = income_before;
    let mut rows = Vec::new();
    let mut total_applied: i64 = 0;

    for loss in &losses {
        if remaining_income <= 0 {
            break;
        }

        let already_used = loss.used_year_1 + loss.used_year_2 + loss.used_year_3;
        let available = loss.loss_amount - already_used;

        if available <= 0 {
            continue;
        }

        // 当期に繰越年度として何年目か判定
        let offset = year - loss.loss_year; // 1, 2, or 3
        if offset < 1 || offset > 3 {
            continue;
        }

        // その年度枠で既に使用済みの金額を確認
        let used_this_slot = match offset {
            1 => loss.used_year_1,
            2 => loss.used_year_2,
            3 => loss.used_year_3,
            _ => 0,
        };

        // この年度枠ではまだ未使用の場合のみ適用
        if used_this_slot > 0 {
            // 既にこの年度枠で使用済み
            rows.push(LossCarryforwardApplied {
                loss_year: loss.loss_year,
                original_loss: loss.loss_amount,
                already_used,
                applied_this_year: 0,
                remaining: available,
            });
            continue;
        }

        let apply = std::cmp::min(available, remaining_income);
        remaining_income -= apply;
        total_applied += apply;

        rows.push(LossCarryforwardApplied {
            loss_year: loss.loss_year,
            original_loss: loss.loss_amount,
            already_used,
            applied_this_year: apply,
            remaining: available - apply,
        });
    }

    Ok(LossCarryforwardSummary {
        rows,
        total_applied,
        income_before,
        income_after: income_before - total_applied,
    })
}

// ── 青色申告決算書（統合データ） ──

pub fn calc_final_statement(conn: &Connection, year: i32) -> SqlResult<FinalStatement> {
    let pl = calc_profit_loss(conn, year)?;
    let bs = calc_balance_sheet(conn, year)?;
    let monthly = calc_monthly_sales_purchases(conn, year)?;
    let dep_rows = calc_depreciation(conn, year)?;
    let rents = fetch_rent_details(conn)?;
    let loss_cf = calc_loss_carryforward(conn, year)?;

    let annual_sales_total: i64 = monthly.iter().map(|m| m.sales).sum();
    let annual_purchases_total: i64 = monthly.iter().map(|m| m.purchases).sum();
    let depreciation_total: i64 = dep_rows.iter().map(|d| d.current_year_dep).sum();
    let rent_total: i64 = rents.iter().map(|r| r.annual_total * r.business_ratio as i64 / 100).sum();

    Ok(FinalStatement {
        profit_loss: pl,
        monthly,
        annual_sales_total,
        annual_purchases_total,
        depreciation_rows: dep_rows,
        depreciation_total,
        rent_details: rents,
        rent_total,
        balance_sheet: bs,
        loss_carryforward: loss_cf,
    })
}
