import { invoke } from "@tauri-apps/api/tauri";
import type {
  Account,
  JournalEntry,
  TrialBalance,
  ProfitLoss,
  BalanceSheet,
  FixedAsset,
  RentDetail,
  FinalStatement,
} from "../types";

// ── 勘定科目 ──

export async function getAccounts(): Promise<Account[]> {
  return invoke("get_accounts");
}

export async function addAccount(
  code: number,
  name: string,
  classification: string,
): Promise<Account> {
  return invoke("add_account", { code, name, classification });
}

// ── 仕訳 ──

export async function addEntry(params: {
  date: string;
  debitAccountId: number;
  debitAmount: number;
  creditAccountId: number;
  creditAmount: number;
  description: string;
}): Promise<number> {
  return invoke("add_entry", {
    date: params.date,
    debit_account_id: params.debitAccountId,
    debit_amount: params.debitAmount,
    credit_account_id: params.creditAccountId,
    credit_amount: params.creditAmount,
    description: params.description,
  });
}

export async function getEntries(
  year: number,
  month?: number,
): Promise<JournalEntry[]> {
  return invoke("get_entries", { year, month });
}

export async function updateEntry(params: {
  id: number;
  date: string;
  debitAccountId: number;
  debitAmount: number;
  creditAccountId: number;
  creditAmount: number;
  description: string;
}): Promise<void> {
  return invoke("update_entry", {
    id: params.id,
    date: params.date,
    debit_account_id: params.debitAccountId,
    debit_amount: params.debitAmount,
    credit_account_id: params.creditAccountId,
    credit_amount: params.creditAmount,
    description: params.description,
  });
}

export async function deleteEntry(id: number): Promise<void> {
  return invoke("delete_entry", { id });
}

// ── 集計・レポート ──

export async function getTrialBalance(
  year: number,
  month?: number,
): Promise<TrialBalance> {
  return invoke("get_trial_balance", { year, month });
}

export async function getProfitLoss(year: number): Promise<ProfitLoss> {
  return invoke("get_profit_loss", { year });
}

export async function getBalanceSheet(year: number): Promise<BalanceSheet> {
  return invoke("get_balance_sheet", { year });
}

// ── 固定資産 ──

export async function getFixedAssets(): Promise<FixedAsset[]> {
  return invoke("get_fixed_assets");
}

export async function addFixedAsset(params: {
  name: string;
  acquisitionDate: string;
  acquisitionCost: number;
  usefulLife: number;
  depreciationMethod: string;
  depreciationRate: number;
  accumulatedDep: number;
  memo: string;
}): Promise<number> {
  return invoke("add_fixed_asset", {
    name: params.name,
    acquisition_date: params.acquisitionDate,
    acquisition_cost: params.acquisitionCost,
    useful_life: params.usefulLife,
    depreciation_method: params.depreciationMethod,
    depreciation_rate: params.depreciationRate,
    accumulated_dep: params.accumulatedDep,
    memo: params.memo,
  });
}

export async function deleteFixedAsset(id: number): Promise<void> {
  return invoke("delete_fixed_asset", { id });
}

// ── 地代家賃内訳 ──

export async function getRentDetails(): Promise<RentDetail[]> {
  return invoke("get_rent_details");
}

export async function addRentDetail(params: {
  payeeAddress: string;
  payeeName: string;
  rentType: string;
  monthlyRent: number;
  annualTotal: number;
  businessRatio: number;
  memo: string;
}): Promise<number> {
  return invoke("add_rent_detail", {
    payee_address: params.payeeAddress,
    payee_name: params.payeeName,
    rent_type: params.rentType,
    monthly_rent: params.monthlyRent,
    annual_total: params.annualTotal,
    business_ratio: params.businessRatio,
    memo: params.memo,
  });
}

export async function deleteRentDetail(id: number): Promise<void> {
  return invoke("delete_rent_detail", { id });
}

// ── 青色申告決算書 ──

export async function getFinalStatement(
  year: number,
): Promise<FinalStatement> {
  return invoke("get_final_statement", { year });
}

// ── エクスポート ──

export async function exportJournalCsv(
  year: number,
  month?: number,
): Promise<string> {
  return invoke("export_journal_csv", { year, month });
}

// ── バックアップ ──

export async function backupDatabase(): Promise<string> {
  return invoke("backup_database");
}
