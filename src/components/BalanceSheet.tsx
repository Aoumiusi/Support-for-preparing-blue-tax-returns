import { useState, useEffect } from "react";
import type { BalanceSheet as BS } from "../types";
import { formatYen } from "../lib/format";
import * as api from "../lib/api";

interface Props {
  year: number;
}

export default function BalanceSheet({ year }: Props) {
  const [data, setData] = useState<BS | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getBalanceSheet(year)
      .then(setData)
      .catch((err) => alert(String(err)))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>;
  if (!data) return <p className="text-sm text-gray-400">データがありません</p>;

  const liabilitiesAndEquity =
    data.total_liabilities + data.total_equity + data.net_income;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">
        貸借対照表 — {year}年12月31日現在
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 資産の部 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-emerald-50 px-4 py-2">
            <h3 className="text-sm font-semibold text-emerald-800">資産の部</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {data.asset_rows.map((row) => (
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
              {data.asset_rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-gray-400 text-center">
                    資産データなし
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-emerald-200 bg-emerald-50 font-semibold">
                <td className="px-4 py-2">資産合計</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatYen(data.total_assets)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 負債・純資産の部 */}
        <div className="space-y-4">
          {/* 負債 */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-red-50 px-4 py-2">
              <h3 className="text-sm font-semibold text-red-800">負債の部</h3>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {data.liability_rows.map((row) => (
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
                {data.liability_rows.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-gray-400 text-center">
                      負債データなし
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-red-200 bg-red-50 font-semibold">
                  <td className="px-4 py-2">負債合計</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatYen(data.total_liabilities)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 純資産 */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-purple-50 px-4 py-2">
              <h3 className="text-sm font-semibold text-purple-800">
                純資産の部
              </h3>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {data.equity_rows.map((row) => (
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
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 italic text-gray-500">
                    当期純利益
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${
                      data.net_income < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {formatYen(data.net_income)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-purple-200 bg-purple-50 font-semibold">
                  <td className="px-4 py-2">純資産合計</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatYen(data.total_equity + data.net_income)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* バランスチェック */}
      <div
        className={`rounded-lg border-2 p-4 text-center ${
          data.total_assets === liabilitiesAndEquity
            ? "border-green-300 bg-green-50"
            : "border-red-300 bg-red-50"
        }`}
      >
        <div className="flex items-center justify-center gap-8 text-sm">
          <div>
            <p className="text-gray-500">資産合計</p>
            <p className="text-xl font-bold tabular-nums">
              {formatYen(data.total_assets)}
            </p>
          </div>
          <span className="text-2xl text-gray-400">=</span>
          <div>
            <p className="text-gray-500">負債 + 純資産合計</p>
            <p className="text-xl font-bold tabular-nums">
              {formatYen(liabilitiesAndEquity)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {data.total_assets === liabilitiesAndEquity
            ? "貸借一致: 正常"
            : "貸借不一致: 仕訳を確認してください"}
        </p>
      </div>
    </div>
  );
}
