import { type ReactNode } from "react";
import type { PageId } from "../types";

interface NavSection {
  title: string;
  items: { id: PageId; label: string }[];
}

const navSections: NavSection[] = [
  {
    title: "記帳",
    items: [
      { id: "journal", label: "仕訳帳" },
      { id: "simple-entry", label: "かんたん入力" },
      { id: "accounts", label: "勘定科目" },
      { id: "fixed-assets", label: "固定資産台帳" },
      { id: "rent-details", label: "地代家賃内訳" },
    ],
  },
  {
    title: "帳簿",
    items: [
      { id: "trial-balance", label: "試算表" },
      { id: "profit-loss", label: "損益計算書" },
      { id: "balance-sheet", label: "貸借対照表" },
    ],
  },
  {
    title: "確定申告",
    items: [
      { id: "loss-carryforward", label: "繰越損失" },
      { id: "final-statement", label: "青色申告決算書" },
    ],
  },
];

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  year: number;
  onYearChange: (year: number) => void;
  onBackup: () => void;
  children: ReactNode;
}

export default function Layout({
  currentPage,
  onNavigate,
  year,
  onYearChange,
  onBackup,
  children,
}: LayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-primary-700 px-6 py-3 text-white">
        <h1 className="text-lg font-bold tracking-wide">
          Tauri-Blue — 青色申告支援
        </h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            会計年度:
            <input
              type="number"
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="w-24 rounded border border-primary-300 bg-primary-600 px-2 py-1 text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </label>
          <button
            onClick={onBackup}
            className="rounded bg-primary-500 px-3 py-1 text-sm hover:bg-primary-400 transition"
          >
            バックアップ
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto print:hidden">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-6 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {section.title}
              </p>
              <ul>
                {section.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={`w-full px-6 py-2.5 text-left text-sm transition ${
                        currentPage === item.id
                          ? "bg-primary-50 font-semibold text-primary-700 border-r-2 border-primary-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
