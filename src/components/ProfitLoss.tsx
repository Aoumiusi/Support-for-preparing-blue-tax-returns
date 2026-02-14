import { useState, useEffect } from "react";
import type { ProfitLoss as PL } from "../types";
import { formatYen } from "../lib/format";
import * as api from "../lib/api";

interface Props {
  year: number;
}

export default function ProfitLoss({ year }: Props) {
  const [data, setData] = useState<PL | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getProfitLoss(year)
      .then(setData)
      .catch((err) => alert(String(err)))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>;
  if (!data) return <p className="text-sm text-gray-400">データがありません</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">
        損益計算書 — {year}年度
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 収益の部 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-blue-50 px-4 py-2">
            <h3 className="text-sm font-semibold text-blue-800">収益の部</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {data.revenue_rows.map((row) => (
                <tr
                  key={row.account_id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-2">{row.account_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatYen(row.amount)}
                  </td>
                </tr>
              ))}
              {data.revenue_rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-gray-400 text-center">
                    収益データなし
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-blue-200 bg-blue-50 font-semibold">
                <td className="px-4 py-2">収益合計</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatYen(data.total_revenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 費用の部 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-orange-50 px-4 py-2">
            <h3 className="text-sm font-semibold text-orange-800">費用の部</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {data.expense_rows.map((row) => (
                <tr
                  key={row.account_id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-2">{row.account_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatYen(row.amount)}
                  </td>
                </tr>
              ))}
              {data.expense_rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-gray-400 text-center">
                    費用データなし
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-orange-200 bg-orange-50 font-semibold">
                <td className="px-4 py-2">費用合計</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatYen(data.total_expense)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 当期純利益 */}
      <div
        className={`rounded-lg border-2 p-4 text-center ${
          data.net_income >= 0
            ? "border-green-300 bg-green-50"
            : "border-red-300 bg-red-50"
        }`}
      >
        <p className="text-sm text-gray-600">
          {data.net_income >= 0 ? "当期純利益" : "当期純損失"}
        </p>
        <p
          className={`text-2xl font-bold tabular-nums ${
            data.net_income >= 0 ? "text-green-700" : "text-red-700"
          }`}
        >
          {formatYen(Math.abs(data.net_income))}
        </p>
      </div>
    </div>
  );
}
