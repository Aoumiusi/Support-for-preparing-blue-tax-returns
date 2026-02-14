import { useState, useEffect, useCallback } from "react";
import type { LossCarryforward, LossCarryforwardSummary } from "../types";
import { formatYen, currentYear } from "../lib/format";
import * as api from "../lib/api";

interface Props {
  year: number;
}

export default function LossCarryforwardList({ year }: Props) {
  const [records, setRecords] = useState<LossCarryforward[]>([]);
  const [summary, setSummary] = useState<LossCarryforwardSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [lossYear, setLossYear] = useState(String(year - 1));
  const [lossAmount, setLossAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.getLossCarryforwards().then(setRecords).catch(console.error);
    api.getLossCarryforwardSummary(year).then(setSummary).catch(console.error);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const yr = parseInt(lossYear, 10);
    const amt = parseInt(lossAmount, 10);

    if (isNaN(yr) || yr < 2000 || yr >= year) {
      setError("損失発生年度を正しく入力してください（当年度より前）");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError("繰越損失額を1円以上で入力してください");
      return;
    }

    try {
      await api.addLossCarryforward({
        lossYear: yr,
        lossAmount: amt,
        memo,
      });
      setLossYear(String(year - 1));
      setLossAmount("");
      setMemo("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("この繰越損失記録を削除しますか？")) return;
    try {
      await api.deleteLossCarryforward(id);
      load();
    } catch (err) {
      alert(String(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          純損失の繰越控除
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
        >
          {showForm ? "閉じる" : "繰越損失を登録"}
        </button>
      </div>

      {/* 説明 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">青色申告の純損失の繰越控除について</p>
        <p>
          青色申告者は、事業所得が赤字（純損失）の場合、その損失額を翌年以降3年間にわたって繰り越し、
          黒字の所得から控除することができます（所得税法第70条）。
        </p>
        <ul className="mt-2 list-disc list-inside space-y-1">
          <li>繰越期間：最大3年</li>
          <li>古い年度の損失から順に控除</li>
          <li>当年の所得が黒字の場合のみ適用</li>
        </ul>
      </div>

      {/* 登録フォーム */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                損失発生年度
              </label>
              <input
                type="number"
                value={lossYear}
                onChange={(e) => setLossYear(e.target.value)}
                min="2000"
                max={year - 1}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                純損失額（円）
              </label>
              <input
                type="number"
                min="1"
                value={lossAmount}
                onChange={(e) => setLossAmount(e.target.value)}
                placeholder="例: 500000"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                備考
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例: 開業初年度の赤字"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 transition"
          >
            登録
          </button>
        </form>
      )}

      {/* 繰越損失の一覧 */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-2">損失発生年度</th>
              <th className="px-4 py-2 text-right">純損失額</th>
              <th className="px-4 py-2 text-right">1年目使用</th>
              <th className="px-4 py-2 text-right">2年目使用</th>
              <th className="px-4 py-2 text-right">3年目使用</th>
              <th className="px-4 py-2 text-right">残額</th>
              <th className="px-4 py-2">備考</th>
              <th className="px-4 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  繰越損失の記録がありません
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const used = r.used_year_1 + r.used_year_2 + r.used_year_3;
                const remaining = r.loss_amount - used;
                const expired = year - r.loss_year > 3;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 ${expired ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-2 font-medium">
                      {r.loss_year}年
                      {expired && (
                        <span className="ml-2 text-xs text-gray-400">（期限切れ）</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-red-600">
                      {formatYen(r.loss_amount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.used_year_1 > 0 ? formatYen(r.used_year_1) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.used_year_2 > 0 ? formatYen(r.used_year_2) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.used_year_3 > 0 ? formatYen(r.used_year_3) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {remaining > 0 ? formatYen(remaining) : "全額使用済"}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{r.memo}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 当年度の繰越控除適用シミュレーション */}
      {summary && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-800">
            {year}年度 繰越控除の適用
          </h3>

          {summary.income_before <= 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              当年度の所得金額が赤字のため、繰越控除は適用されません。
              {summary.income_before < 0 && (
                <p className="mt-1">
                  当年度の純損失額 {formatYen(Math.abs(summary.income_before))} は翌年以降に繰越可能です。
                </p>
              )}
            </div>
          ) : summary.rows.length === 0 ? (
            <p className="text-sm text-gray-400">
              適用可能な繰越損失がありません
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-2">損失発生年度</th>
                    <th className="px-4 py-2 text-right">損失額</th>
                    <th className="px-4 py-2 text-right">使用済み</th>
                    <th className="px-4 py-2 text-right">当年適用額</th>
                    <th className="px-4 py-2 text-right">残額</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((r) => (
                    <tr key={r.loss_year} className="border-b border-gray-50">
                      <td className="px-4 py-2">{r.loss_year}年</td>
                      <td className="px-4 py-2 text-right tabular-nums text-red-600">
                        {formatYen(r.original_loss)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatYen(r.already_used)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-green-700">
                        {r.applied_this_year > 0 ? formatYen(r.applied_this_year) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatYen(r.remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td colSpan={3} className="px-4 py-2">繰越控除適用額 合計</td>
                    <td className="px-4 py-2 text-right tabular-nums text-green-700">
                      {formatYen(summary.total_applied)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-3 text-center">
                  <p className="text-xs text-gray-500">控除前所得</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatYen(summary.income_before)}
                  </p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-600">繰越控除額</p>
                  <p className="text-lg font-bold tabular-nums text-green-700">
                    - {formatYen(summary.total_applied)}
                  </p>
                </div>
                <div className="rounded-lg border-2 border-primary-300 bg-primary-50 p-3 text-center">
                  <p className="text-xs text-primary-600">控除後所得</p>
                  <p className="text-lg font-bold tabular-nums text-primary-700">
                    {formatYen(summary.income_after)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
