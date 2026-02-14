import { useState, useEffect, useCallback } from "react";
import type { RentDetail } from "../types";
import { formatYen } from "../lib/format";
import * as api from "../lib/api";

export default function RentDetailList() {
  const [details, setDetails] = useState<RentDetail[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [payeeAddress, setPayeeAddress] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [rentType, setRentType] = useState("事務所");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [annualTotal, setAnnualTotal] = useState("");
  const [businessRatio, setBusinessRatio] = useState("100");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.getRentDetails().then(setDetails).catch(console.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 月額入力時に年額を自動計算
  function handleMonthlyChange(val: string) {
    setMonthlyRent(val);
    const m = parseInt(val, 10);
    if (!isNaN(m) && m >= 0) {
      setAnnualTotal(String(m * 12));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const monthly = parseInt(monthlyRent, 10);
    const annual = parseInt(annualTotal, 10);
    const ratio = parseInt(businessRatio, 10);
    if (!payeeName.trim()) {
      setError("支払先氏名を入力してください");
      return;
    }
    if (isNaN(monthly) || monthly < 0) {
      setError("月額家賃を入力してください");
      return;
    }
    if (isNaN(ratio) || ratio < 1 || ratio > 100) {
      setError("事業割合は1〜100%で入力してください");
      return;
    }

    try {
      await api.addRentDetail({
        payeeAddress,
        payeeName: payeeName.trim(),
        rentType,
        monthlyRent: monthly,
        annualTotal: isNaN(annual) ? monthly * 12 : annual,
        businessRatio: ratio,
        memo,
      });
      setPayeeAddress("");
      setPayeeName("");
      setRentType("事務所");
      setMonthlyRent("");
      setAnnualTotal("");
      setBusinessRatio("100");
      setMemo("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("この地代家賃内訳を削除しますか？")) return;
    try {
      await api.deleteRentDetail(id);
      load();
    } catch (err) {
      alert(String(err));
    }
  }

  const totalExpense = details.reduce(
    (s, r) => s + Math.floor((r.annual_total * r.business_ratio) / 100),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          地代家賃の内訳
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
        >
          {showForm ? "閉じる" : "内訳を追加"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                支払先の氏名・名称
              </label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="例: 山田不動産"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                支払先の住所
              </label>
              <input
                type="text"
                value={payeeAddress}
                onChange={(e) => setPayeeAddress(e.target.value)}
                placeholder="例: 東京都渋谷区..."
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                賃借物件
              </label>
              <select
                value={rentType}
                onChange={(e) => setRentType(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="事務所">事務所</option>
                <option value="店舗">店舗</option>
                <option value="倉庫">倉庫</option>
                <option value="駐車場">駐車場</option>
                <option value="自宅兼事務所">自宅兼事務所</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                月額家賃（円）
              </label>
              <input
                type="number"
                min="0"
                value={monthlyRent}
                onChange={(e) => handleMonthlyChange(e.target.value)}
                placeholder="0"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                年間支払額（円）
              </label>
              <input
                type="number"
                min="0"
                value={annualTotal}
                onChange={(e) => setAnnualTotal(e.target.value)}
                placeholder="月額×12が自動入力"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                事業割合（%）
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={businessRatio}
                onChange={(e) => setBusinessRatio(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              備考
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 transition"
          >
            追加
          </button>
        </form>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-3 py-2">支払先</th>
              <th className="px-3 py-2">住所</th>
              <th className="px-3 py-2">物件</th>
              <th className="px-3 py-2 text-right">月額</th>
              <th className="px-3 py-2 text-right">年額</th>
              <th className="px-3 py-2 text-right">事業割合</th>
              <th className="px-3 py-2 text-right">必要経費算入額</th>
              <th className="px-3 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {details.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  地代家賃の内訳が登録されていません
                </td>
              </tr>
            ) : (
              details.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-3 py-2">{r.payee_name}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {r.payee_address}
                  </td>
                  <td className="px-3 py-2">{r.rent_type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatYen(r.monthly_rent)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatYen(r.annual_total)}
                  </td>
                  <td className="px-3 py-2 text-right">{r.business_ratio}%</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatYen(
                      Math.floor(
                        (r.annual_total * r.business_ratio) / 100,
                      ),
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {details.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td colSpan={6} className="px-3 py-2">
                  必要経費算入額 合計
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatYen(totalExpense)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
