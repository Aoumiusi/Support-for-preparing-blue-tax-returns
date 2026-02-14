import { useState } from "react";
import type { Account } from "../types";
import { todayString } from "../lib/format";
import * as api from "../lib/api";

interface Props {
  accounts: Account[];
  onSaved: () => void;
}

// よくある仕訳テンプレート
const templates = [
  {
    label: "売上入金（普通預金）",
    debitCode: 1112,
    creditCode: 4100,
    desc: "売上入金",
  },
  {
    label: "家賃の支払い",
    debitCode: 5300,
    creditCode: 1112,
    desc: "家賃支払い",
  },
  {
    label: "交通費（現金）",
    debitCode: 5500,
    creditCode: 1111,
    desc: "交通費",
  },
  {
    label: "消耗品購入",
    debitCode: 5600,
    creditCode: 1111,
    desc: "消耗品購入",
  },
  {
    label: "通信費の支払い",
    debitCode: 5400,
    creditCode: 1112,
    desc: "通信費",
  },
];

export default function JournalEntryForm({ accounts, onSaved }: Props) {
  const [date, setDate] = useState(todayString());
  const [debitAccountId, setDebitAccountId] = useState<number>(0);
  const [creditAccountId, setCreditAccountId] = useState<number>(0);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function findAccountByCode(code: number): Account | undefined {
    return accounts.find((a) => a.code === code);
  }

  function applyTemplate(t: (typeof templates)[0]) {
    const debit = findAccountByCode(t.debitCode);
    const credit = findAccountByCode(t.creditCode);
    if (debit) setDebitAccountId(debit.id);
    if (credit) setCreditAccountId(credit.id);
    setDescription(t.desc);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amountNum = parseInt(amount, 10);
    if (!date) {
      setError("日付を入力してください");
      return;
    }
    if (!debitAccountId || !creditAccountId) {
      setError("借方・貸方の科目を選択してください");
      return;
    }
    if (debitAccountId === creditAccountId) {
      setError("借方と貸方に同じ科目は指定できません");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("金額は1円以上の整数を入力してください");
      return;
    }

    setSaving(true);
    try {
      await api.addEntry({
        date,
        debitAccountId,
        debitAmount: amountNum,
        creditAccountId,
        creditAmount: amountNum,
        description,
      });
      // reset form
      setAmount("");
      setDescription("");
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-800">仕訳入力</h2>

      {/* テンプレート */}
      <div className="mb-4 flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => applyTemplate(t)}
            className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs text-primary-700 hover:bg-primary-100 transition"
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* 日付 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              日付
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* 借方科目 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              借方科目
            </label>
            <select
              value={debitAccountId}
              onChange={(e) => setDebitAccountId(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={0}>-- 選択 --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* 貸方科目 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              貸方科目
            </label>
            <select
              value={creditAccountId}
              onChange={(e) => setCreditAccountId(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={0}>-- 選択 --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* 金額 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              金額（円）
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* 摘要 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              摘要
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="取引内容"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition"
        >
          {saving ? "保存中..." : "仕訳を登録"}
        </button>
      </form>
    </div>
  );
}
