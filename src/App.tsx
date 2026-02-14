import { useState, useEffect, useCallback } from "react";
import type { PageId, Account, JournalEntry } from "./types";
import { currentYear } from "./lib/format";
import * as api from "./lib/api";

import Layout from "./components/Layout";
import JournalEntryForm from "./components/JournalEntryForm";
import JournalEntryList from "./components/JournalEntryList";
import AccountList from "./components/AccountList";
import TrialBalance from "./components/TrialBalance";
import ProfitLoss from "./components/ProfitLoss";
import BalanceSheet from "./components/BalanceSheet";

export default function App() {
  const [page, setPage] = useState<PageId>("journal");
  const [year, setYear] = useState(currentYear());

  // 勘定科目
  const [accounts, setAccounts] = useState<Account[]>([]);

  // 仕訳帳
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [month, setMonth] = useState<number | null>(null);

  const loadAccounts = useCallback(() => {
    api.getAccounts().then(setAccounts).catch(console.error);
  }, []);

  const loadEntries = useCallback(() => {
    api
      .getEntries(year, month ?? undefined)
      .then(setEntries)
      .catch(console.error);
  }, [year, month]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleBackup() {
    try {
      const path = await api.backupDatabase();
      alert(`バックアップを作成しました:\n${path}`);
    } catch (err) {
      alert(`バックアップに失敗しました: ${err}`);
    }
  }

  async function handleExportCsv() {
    try {
      const csvContent = await api.exportJournalCsv(year, month ?? undefined);
      // Create a Blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `仕訳帳_${year}${month ? `_${month}月` : ""}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`CSV出力に失敗しました: ${err}`);
    }
  }

  function renderPage() {
    switch (page) {
      case "journal":
        return (
          <div className="space-y-6">
            <JournalEntryForm accounts={accounts} onSaved={loadEntries} />
            <JournalEntryList
              entries={entries}
              year={year}
              month={month}
              onMonthChange={setMonth}
              onDeleted={loadEntries}
              onExportCsv={handleExportCsv}
            />
          </div>
        );
      case "accounts":
        return <AccountList accounts={accounts} onAdded={loadAccounts} />;
      case "trial-balance":
        return <TrialBalance year={year} />;
      case "profit-loss":
        return <ProfitLoss year={year} />;
      case "balance-sheet":
        return <BalanceSheet year={year} />;
    }
  }

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      year={year}
      onYearChange={setYear}
      onBackup={handleBackup}
    >
      {renderPage()}
    </Layout>
  );
}
