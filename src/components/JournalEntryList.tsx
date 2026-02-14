import { useState } from "react";
import type { JournalEntry } from "../types";
import { formatYen } from "../lib/format";
import * as api from "../lib/api";

interface Props {
  entries: JournalEntry[];
  year: number;
  month: number | null;
  onMonthChange: (month: number | null) => void;
  onDeleted: () => void;
  onExportCsv: () => void;
}

export default function JournalEntryList({
  entries,
  year,
  month,
  onMonthChange,
  onDeleted,
  onExportCsv,
}: Props) {
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDelete(id: number) {
    if (!confirm("この仕訳を削除しますか？")) return;
    setDeleting(id);
    try {
      await api.deleteEntry(id);
      onDeleted();
    } catch (err) {
      alert(String(err));
    } finally {
      setDeleting(null);
    }
  }

  const totalDebit = entries.reduce((s, e) => s + e.debit_amount, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit_amount, 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <h2 className="text-base font-semibold text-gray-800">
          仕訳帳 — {year}年{month ? `${month}月` : "（年間）"}
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={month ?? ""}
            onChange={(e) =>
              onMonthChange(e.target.value ? Number(e.target.value) : null)
            }
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">全月</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
          <button
            onClick={onExportCsv}
            className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            CSV出力
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-2">日付</th>
              <th className="px-4 py-2">借方科目</th>
              <th className="px-4 py-2 text-right">借方金額</th>
              <th className="px-4 py-2">貸方科目</th>
              <th className="px-4 py-2 text-right">貸方金額</th>
              <th className="px-4 py-2">摘要</th>
              <th className="px-4 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  仕訳データがありません
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-2 whitespace-nowrap">{entry.date}</td>
                  <td className="px-4 py-2">{entry.debit_account_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatYen(entry.debit_amount)}
                  </td>
                  <td className="px-4 py-2">{entry.credit_account_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatYen(entry.credit_amount)}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {entry.description}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting === entry.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-2">合計</td>
                <td></td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatYen(totalDebit)}
                </td>
                <td></td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatYen(totalCredit)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
