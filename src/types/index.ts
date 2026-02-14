// 勘定科目
export interface Account {
  id: number;
  code: number;
  name: string;
  classification: "資産" | "負債" | "純資産" | "収益" | "費用";
}

// 仕訳
export interface JournalEntry {
  id: number;
  date: string;
  debit_account_id: number;
  debit_account_name?: string;
  debit_amount: number;
  credit_account_id: number;
  credit_account_name?: string;
  credit_amount: number;
  description: string;
  created_at: string;
}

// 試算表
export interface TrialBalanceRow {
  account_id: number;
  account_code: number;
  account_name: string;
  classification: string;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  debit_grand_total: number;
  credit_grand_total: number;
}

// 損益計算書
export interface ProfitLossRow {
  account_id: number;
  account_code: number;
  account_name: string;
  amount: number;
}

export interface ProfitLoss {
  revenue_rows: ProfitLossRow[];
  expense_rows: ProfitLossRow[];
  total_revenue: number;
  total_expense: number;
  net_income: number;
}

// 貸借対照表
export interface BalanceSheetRow {
  account_id: number;
  account_code: number;
  account_name: string;
  amount: number;
}

export interface BalanceSheet {
  asset_rows: BalanceSheetRow[];
  liability_rows: BalanceSheetRow[];
  equity_rows: BalanceSheetRow[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  net_income: number;
}

// 固定資産
export interface FixedAsset {
  id: number;
  name: string;
  acquisition_date: string;
  acquisition_cost: number;
  useful_life: number;
  depreciation_method: string;
  depreciation_rate: number;
  accumulated_dep: number;
  memo: string;
  is_active: boolean;
}

export interface DepreciationRow {
  asset_id: number;
  asset_name: string;
  acquisition_date: string;
  acquisition_cost: number;
  depreciation_method: string;
  useful_life: number;
  depreciation_rate: number;
  accumulated_dep_prev: number;
  current_year_dep: number;
  accumulated_dep_end: number;
  book_value_end: number;
}

// 地代家賃内訳
export interface RentDetail {
  id: number;
  payee_address: string;
  payee_name: string;
  rent_type: string;
  monthly_rent: number;
  annual_total: number;
  business_ratio: number;
  memo: string;
}

// 月別売上・仕入
export interface MonthlySalesPurchase {
  month: number;
  sales: number;
  purchases: number;
}

// 青色申告決算書（統合）
export interface FinalStatement {
  profit_loss: ProfitLoss;
  monthly: MonthlySalesPurchase[];
  annual_sales_total: number;
  annual_purchases_total: number;
  depreciation_rows: DepreciationRow[];
  depreciation_total: number;
  rent_details: RentDetail[];
  rent_total: number;
  balance_sheet: BalanceSheet;
}

// ナビゲーション
export type PageId =
  | "journal"
  | "accounts"
  | "trial-balance"
  | "profit-loss"
  | "balance-sheet"
  | "fixed-assets"
  | "rent-details"
  | "final-statement";
