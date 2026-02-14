use serde::{Deserialize, Serialize};

// ── 固定資産 ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixedAsset {
    pub id: i64,
    pub name: String,
    pub acquisition_date: String,
    pub acquisition_cost: i64,
    pub useful_life: i32,
    pub depreciation_method: String,
    pub depreciation_rate: i32,
    pub accumulated_dep: i64,
    pub memo: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepreciationRow {
    pub asset_id: i64,
    pub asset_name: String,
    pub acquisition_date: String,
    pub acquisition_cost: i64,
    pub depreciation_method: String,
    pub useful_life: i32,
    pub depreciation_rate: i32,
    pub accumulated_dep_prev: i64,
    pub current_year_dep: i64,
    pub accumulated_dep_end: i64,
    pub book_value_end: i64,
}

// ── 地代家賃内訳 ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RentDetail {
    pub id: i64,
    pub payee_address: String,
    pub payee_name: String,
    pub rent_type: String,
    pub monthly_rent: i64,
    pub annual_total: i64,
    pub business_ratio: i32,
    pub memo: String,
}

// ── 純損失の繰越控除 ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LossCarryforward {
    pub id: i64,
    pub loss_year: i32,
    pub loss_amount: i64,
    pub used_year_1: i64,
    pub used_year_2: i64,
    pub used_year_3: i64,
    pub memo: String,
}

/// 当期に適用可能な繰越損失の明細行
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LossCarryforwardApplied {
    pub loss_year: i32,
    pub original_loss: i64,
    pub already_used: i64,
    pub applied_this_year: i64,
    pub remaining: i64,
}

/// 繰越控除の計算結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LossCarryforwardSummary {
    pub rows: Vec<LossCarryforwardApplied>,
    pub total_applied: i64,
    pub income_before: i64,
    pub income_after: i64,
}

// ── 月別集計 ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlySalesPurchase {
    pub month: i32,
    pub sales: i64,
    pub purchases: i64,
}

// ── 青色申告決算書（統合） ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinalStatement {
    pub profit_loss: ProfitLoss,
    pub monthly: Vec<MonthlySalesPurchase>,
    pub annual_sales_total: i64,
    pub annual_purchases_total: i64,
    pub depreciation_rows: Vec<DepreciationRow>,
    pub depreciation_total: i64,
    pub rent_details: Vec<RentDetail>,
    pub rent_total: i64,
    pub balance_sheet: BalanceSheet,
    pub loss_carryforward: LossCarryforwardSummary,
}

// ── 勘定科目 ──

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
