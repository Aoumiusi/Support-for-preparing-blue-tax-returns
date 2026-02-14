import { useState, useEffect } from "react";
import type { TrialBalance as TB } from "../types";
import { formatYen } from "../lib/format";
import * as api from "../lib/api";

interface Props {
  year: number;
}

export default function TrialBalance({ year }: Props) {
  const [data, setData] = useState<TB | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getTrialBalance(year, month ?? undefined)
      .then(setData)
      .catch((err) => alert(String(err)))
      .finally(() => setLoading(false));
  }, [year, month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          試算表 — {year}年{month ? `${month}月` : "（年間）"}
        </h2>
        <select
          value={month ?? ""}
          onChange={(e) =>
            setMonth(e.target.value ? Number(e.target.value) : null)
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
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : !data || data.rows.length === 0 ? (
        <p className="text-sm text-gray-400">データがありません</p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-2">コード</th>
                <th className="px-4 py-2">科目名</th>
                <th className="px-4 py-2">分類</th>
                <th className="px-4 py-2 text-right">借方合計</th>
                <th className="px-4 py-2 text-right">貸方合計</th>
                <th className="px-4 py-2 text-right">残高</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.account_id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">
                    {row.account_code}
                  </td>
                  <td className="px-4 py-2">{row.account_name}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {row.classification}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatYen(row.debit_total)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatYen(row.credit_total)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums font-medium ${
                      row.balance < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {formatYen(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td colSpan={3} className="px-4 py-2">
                  合計
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatYen(data.debit_grand_total)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatYen(data.credit_grand_total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
