use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: i64,
    pub code: i32,
    pub name: String,
    pub classification: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEntry {
    pub id: i64,
    pub date: String,
    pub debit_account_id: i64,
    pub debit_account_name: Option<String>,
    pub debit_amount: i64,
    pub credit_account_id: i64,
    pub credit_account_name: Option<String>,
    pub credit_amount: i64,
    pub description: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrialBalanceRow {
    pub account_id: i64,
    pub account_code: i32,
    pub account_name: String,
    pub classification: String,
    pub debit_total: i64,
    pub credit_total: i64,
    pub balance: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrialBalance {
    pub rows: Vec<TrialBalanceRow>,
    pub debit_grand_total: i64,
    pub credit_grand_total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitLossRow {
    pub account_id: i64,
    pub account_code: i32,
    pub account_name: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitLoss {
    pub revenue_rows: Vec<ProfitLossRow>,
    pub expense_rows: Vec<ProfitLossRow>,
    pub total_revenue: i64,
    pub total_expense: i64,
    pub net_income: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceSheetRow {
    pub account_id: i64,
    pub account_code: i32,
    pub account_name: String,
    pub amount: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceSheet {
    pub asset_rows: Vec<BalanceSheetRow>,
    pub liability_rows: Vec<BalanceSheetRow>,
    pub equity_rows: Vec<BalanceSheetRow>,
    pub total_assets: i64,
    pub total_liabilities: i64,
    pub total_equity: i64,
    pub net_income: i64,
}
