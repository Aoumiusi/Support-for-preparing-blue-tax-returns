import { useState, useEffect } from "react";
import type { FinalStatement as FS } from "../types";
import { formatYen } from "../lib/format";
import * as api from "../lib/api";

interface Props {
  year: number;
}

type Page = 1 | 2 | 3 | 4;

const pageLabels: Record<Page, string> = {
  1: "第1面 損益計算書",
  2: "第2面 月別売上・仕入",
  3: "第3面 減価償却・経費内訳",
  4: "第4面 貸借対照表",
};

export default function FinalStatement({ year }: Props) {
  const [data, setData] = useState<FS | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>(1);

  useEffect(() => {
    setLoading(true);
    api
      .getFinalStatement(year)
      .then(setData)
      .catch((err) => alert(String(err)))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>;
  if (!data) return <p className="text-sm text-gray-400">データがありません</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          青色申告決算書 — {year}年度
        </h2>
        <button
          onClick={() => window.print()}
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 transition print:hidden"
        >
          印刷
        </button>
      </div>

      {/* ページタブ */}
      <div className="flex gap-1 border-b border-gray-200 print:hidden">
        {([1, 2, 3, 4] as Page[]).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`px-4 py-2 text-sm transition rounded-t ${
              page === p
                ? "bg-white border border-b-white border-gray-200 font-semibold text-primary-700 -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {pageLabels[p]}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {page === 1 && <Page1ProfitLoss data={data} year={year} />}
        {page === 2 && <Page2Monthly data={data} year={year} />}
        {page === 3 && <Page3Details data={data} year={year} />}
        {page === 4 && <Page4BalanceSheet data={data} year={year} />}
      </div>
    </div>
  );
}

// ─── 第1面: 損益計算書 ───

function Page1ProfitLoss({ data, year }: { data: FS; year: number }) {
  const pl = data.profit_loss;
  const grossProfit = pl.total_revenue - (pl.expense_rows.find(r => r.account_name === "仕入高")?.amount ?? 0);

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-gray-300 pb-3">
        <h3 className="text-base font-bold">損益計算書（青色申告決算書 第1面）</h3>
        <p className="text-xs text-gray-500">自 {year}年1月1日 至 {year}年12月31日</p>
      </div>

      {/* 売上 */}
      <section>
        <h4 className="text-sm font-semibold text-blue-700 border-b border-blue-200 pb-1 mb-2">
          収益の部
        </h4>
        <table className="w-full text-sm">
          <tbody>
            {pl.revenue_rows.map((r) => (
              <tr key={r.account_id} className="border-b border-gray-50">
                <td className="py-1.5 pl-4">{r.account_name}</td>
                <td className="py-1.5 text-right tabular-nums w-36">{formatYen(r.amount)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-blue-200 font-semibold bg-blue-50">
              <td className="py-2 pl-4">売上（収入）金額 合計</td>
              <td className="py-2 text-right tabular-nums w-36">{formatYen(pl.total_revenue)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 売上原価 */}
      <section>
        <h4 className="text-sm font-semibold text-amber-700 border-b border-amber-200 pb-1 mb-2">
          売上原価
        </h4>
        <table className="w-full text-sm">
          <tbody>
            {pl.expense_rows.filter(r => r.account_name === "仕入高").map((r) => (
              <tr key={r.account_id} className="border-b border-gray-50">
                <td className="py-1.5 pl-4">{r.account_name}</td>
                <td className="py-1.5 text-right tabular-nums w-36">{formatYen(r.amount)}</td>
              </tr>
            ))}
            <tr className="border-t border-amber-200 font-medium">
              <td className="py-1.5 pl-4">差引原価</td>
              <td className="py-1.5 text-right tabular-nums w-36">{formatYen(pl.expense_rows.find(r => r.account_name === "仕入高")?.amount ?? 0)}</td>
            </tr>
            <tr className="border-t-2 border-green-200 font-semibold bg-green-50">
              <td className="py-2 pl-4">売上総利益（粗利）</td>
              <td className="py-2 text-right tabular-nums w-36">{formatYen(grossProfit)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 経費 */}
      <section>
        <h4 className="text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1 mb-2">
          経費の部
        </h4>
        <table className="w-full text-sm">
          <tbody>
            {pl.expense_rows.filter(r => r.account_name !== "仕入高").map((r) => (
              <tr key={r.account_id} className="border-b border-gray-50">
                <td className="py-1.5 pl-4">{r.account_name}</td>
                <td className="py-1.5 text-right tabular-nums w-36">{formatYen(r.amount)}</td>
              </tr>
            ))}
            {pl.expense_rows.filter(r => r.account_name !== "仕入高").length === 0 && (
              <tr><td colSpan={2} className="py-3 text-center text-gray-400">経費データなし</td></tr>
            )}
            <tr className="border-t-2 border-orange-200 font-semibold bg-orange-50">
              <td className="py-2 pl-4">経費合計</td>
              <td className="py-2 text-right tabular-nums w-36">
                {formatYen(pl.expense_rows.filter(r => r.account_name !== "仕入高").reduce((s, r) => s + r.amount, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 差引金額 = 所得金額 */}
      <div className={`rounded-lg border-2 p-4 text-center ${
        pl.net_income >= 0 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
      }`}>
        <p className="text-sm text-gray-600">差引金額（所得金額）</p>
        <p className={`text-2xl font-bold tabular-nums ${
          pl.net_income >= 0 ? "text-green-700" : "text-red-700"
        }`}>
          {formatYen(pl.net_income)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          青色申告特別控除前の所得金額
        </p>
      </div>
    </div>
  );
}

// ─── 第2面: 月別売上（収入）金額及び仕入金額 ───

function Page2Monthly({ data, year }: { data: FS; year: number }) {
  return (
    <div className="space-y-6">
      <div className="text-center border-b border-gray-300 pb-3">
        <h3 className="text-base font-bold">月別売上（収入）金額及び仕入金額</h3>
        <p className="text-xs text-gray-500">{year}年度</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
              <th className="px-4 py-2 text-left">月</th>
              <th className="px-4 py-2 text-right">売上（収入）金額</th>
              <th className="px-4 py-2 text-right">仕入金額</th>
              <th className="px-4 py-2 text-right">差額</th>
            </tr>
          </thead>
          <tbody>
            {data.monthly.map((m) => (
              <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{m.month}月</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatYen(m.sales)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatYen(m.purchases)}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${m.sales - m.purchases < 0 ? "text-red-600" : ""}`}>
                  {formatYen(m.sales - m.purchases)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="px-4 py-2">年間合計</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatYen(data.annual_sales_total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatYen(data.annual_purchases_total)}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {formatYen(data.annual_sales_total - data.annual_purchases_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── 第3面: 減価償却費の計算、地代家賃の内訳 ───

function Page3Details({ data, year }: { data: FS; year: number }) {
  return (
    <div className="space-y-8">
      <div className="text-center border-b border-gray-300 pb-3">
        <h3 className="text-base font-bold">減価償却費の計算 / 地代家賃の内訳</h3>
        <p className="text-xs text-gray-500">{year}年度</p>
      </div>

      {/* 減価償却 */}
      <section>
        <h4 className="text-sm font-semibold text-violet-700 border-b border-violet-200 pb-1 mb-3">
          減価償却費の計算
        </h4>
        {data.depreciation_rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-3 text-center">固定資産が登録されていません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 font-medium text-gray-500">
                  <th className="px-2 py-1.5 text-left">資産名</th>
                  <th className="px-2 py-1.5 text-left">取得年月</th>
                  <th className="px-2 py-1.5 text-right">取得価額</th>
                  <th className="px-2 py-1.5">償却方法</th>
                  <th className="px-2 py-1.5 text-right">耐用年数</th>
                  <th className="px-2 py-1.5 text-right">償却率</th>
                  <th className="px-2 py-1.5 text-right">期首累計</th>
                  <th className="px-2 py-1.5 text-right">本年分</th>
                  <th className="px-2 py-1.5 text-right">期末累計</th>
                  <th className="px-2 py-1.5 text-right">期末帳簿価額</th>
                </tr>
              </thead>
              <tbody>
                {data.depreciation_rows.map((d) => (
                  <tr key={d.asset_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-2 py-1.5">{d.asset_name}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{d.acquisition_date.substring(0, 7)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatYen(d.acquisition_cost)}</td>
                    <td className="px-2 py-1.5 text-center">{d.depreciation_method}</td>
                    <td className="px-2 py-1.5 text-right">{d.useful_life}</td>
                    <td className="px-2 py-1.5 text-right">{(d.depreciation_rate / 10000).toFixed(3)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatYen(d.accumulated_dep_prev)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium text-violet-700">{formatYen(d.current_year_dep)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatYen(d.accumulated_dep_end)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium">{formatYen(d.book_value_end)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-violet-200 bg-violet-50 font-semibold text-sm">
                  <td colSpan={7} className="px-2 py-2">本年分の減価償却費合計</td>
                  <td className="px-2 py-2 text-right tabular-nums text-violet-700">{formatYen(data.depreciation_total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* 地代家賃の内訳 */}
      <section>
        <h4 className="text-sm font-semibold text-teal-700 border-b border-teal-200 pb-1 mb-3">
          地代家賃の内訳
        </h4>
        {data.rent_details.length === 0 ? (
          <p className="text-sm text-gray-400 py-3 text-center">地代家賃の内訳が登録されていません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
                  <th className="px-3 py-1.5 text-left">支払先住所</th>
                  <th className="px-3 py-1.5 text-left">支払先氏名</th>
                  <th className="px-3 py-1.5 text-left">賃借物件</th>
                  <th className="px-3 py-1.5 text-right">月額</th>
                  <th className="px-3 py-1.5 text-right">年額</th>
                  <th className="px-3 py-1.5 text-right">事業割合</th>
                  <th className="px-3 py-1.5 text-right">必要経費算入額</th>
                </tr>
              </thead>
              <tbody>
                {data.rent_details.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-xs">{r.payee_address}</td>
                    <td className="px-3 py-1.5">{r.payee_name}</td>
                    <td className="px-3 py-1.5">{r.rent_type}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatYen(r.monthly_rent)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatYen(r.annual_total)}</td>
                    <td className="px-3 py-1.5 text-right">{r.business_ratio}%</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                      {formatYen(Math.floor(r.annual_total * r.business_ratio / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-teal-200 bg-teal-50 font-semibold">
                  <td colSpan={6} className="px-3 py-2">必要経費算入額 合計</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatYen(data.rent_total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── 第4面: 貸借対照表 ───

function Page4BalanceSheet({ data, year }: { data: FS; year: number }) {
  const bs = data.balance_sheet;
  const liabAndEquity = bs.total_liabilities + bs.total_equity + bs.net_income;

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-gray-300 pb-3">
        <h3 className="text-base font-bold">貸借対照表</h3>
        <p className="text-xs text-gray-500">{year}年12月31日現在</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 資産の部 */}
        <div className="rounded-lg border border-gray-200">
          <div className="border-b border-gray-100 bg-emerald-50 px-4 py-2">
            <h4 className="text-sm font-semibold text-emerald-800">資産の部</h4>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {bs.asset_rows.map((r) => (
                <tr key={r.account_id} className="border-b border-gray-50">
                  <td className="px-4 py-1.5">{r.account_name}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums w-32">{formatYen(r.amount)}</td>
                </tr>
              ))}
              {bs.asset_rows.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-3 text-center text-gray-400">データなし</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-emerald-200 bg-emerald-50 font-semibold">
                <td className="px-4 py-2">資産合計</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatYen(bs.total_assets)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 負債・純資産 */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200">
            <div className="border-b border-gray-100 bg-red-50 px-4 py-2">
              <h4 className="text-sm font-semibold text-red-800">負債の部</h4>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {bs.liability_rows.map((r) => (
                  <tr key={r.account_id} className="border-b border-gray-50">
                    <td className="px-4 py-1.5">{r.account_name}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums w-32">{formatYen(r.amount)}</td>
                  </tr>
                ))}
                {bs.liability_rows.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-3 text-center text-gray-400">データなし</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-red-200 bg-red-50 font-semibold">
                  <td className="px-4 py-2">負債合計</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatYen(bs.total_liabilities)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200">
            <div className="border-b border-gray-100 bg-purple-50 px-4 py-2">
              <h4 className="text-sm font-semibold text-purple-800">純資産の部</h4>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {bs.equity_rows.map((r) => (
                  <tr key={r.account_id} className="border-b border-gray-50">
                    <td className="px-4 py-1.5">{r.account_name}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums w-32">{formatYen(r.amount)}</td>
                  </tr>
                ))}
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-1.5 italic text-gray-500">青色申告特別控除前の所得金額</td>
                  <td className={`px-4 py-1.5 text-right tabular-nums ${bs.net_income < 0 ? "text-red-600" : ""}`}>
                    {formatYen(bs.net_income)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-purple-200 bg-purple-50 font-semibold">
                  <td className="px-4 py-2">純資産合計</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatYen(bs.total_equity + bs.net_income)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* 貸借一致チェック */}
      <div className={`rounded-lg border-2 p-4 text-center ${
        bs.total_assets === liabAndEquity ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
      }`}>
        <div className="flex items-center justify-center gap-8 text-sm">
          <div>
            <p className="text-gray-500">資産合計</p>
            <p className="text-xl font-bold tabular-nums">{formatYen(bs.total_assets)}</p>
          </div>
          <span className="text-2xl text-gray-400">=</span>
          <div>
            <p className="text-gray-500">負債 + 純資産</p>
            <p className="text-xl font-bold tabular-nums">{formatYen(liabAndEquity)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {bs.total_assets === liabAndEquity ? "貸借一致: 正常" : "貸借不一致: 仕訳を確認してください"}
        </p>
      </div>
    </div>
  );
}
