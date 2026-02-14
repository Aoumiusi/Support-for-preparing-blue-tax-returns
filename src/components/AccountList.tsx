import { useState } from "react";
import type { Account } from "../types";
import * as api from "../lib/api";

interface Props {
  accounts: Account[];
  onAdded: () => void;
}

const classifications = ["資産", "負債", "純資産", "収益", "費用"] as const;

export default function AccountList({ accounts, onAdded }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [classification, setClassification] = useState<string>("費用");
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const codeNum = parseInt(code, 10);
    if (isNaN(codeNum) || codeNum <= 0) {
      setError("科目コードは正の整数を入力してください");
      return;
    }
    if (!name.trim()) {
      setError("科目名を入力してください");
      return;
    }

    try {
      await api.addAccount(codeNum, name.trim(), classification);
      setCode("");
      setName("");
      setShowForm(false);
      onAdded();
    } catch (err) {
      setError(String(err));
    }
  }

  const grouped = classifications.map((c) => ({
    classification: c,
    items: accounts.filter((a) => a.classification === c),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">勘定科目一覧</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
        >
          {showForm ? "閉じる" : "科目を追加"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="科目コード"
              className="w-32 rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="科目名"
              className="w-48 rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {classifications.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 transition"
            >
              追加
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {grouped.map((g) => (
          <div
            key={g.classification}
            className="rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 px-4 py-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {g.classification}
              </h3>
            </div>
            <ul className="divide-y divide-gray-50">
              {g.items.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-gray-400 mr-2">
                    {a.code}
                  </span>
                  <span className="flex-1">{a.name}</span>
                </li>
              ))}
              {g.items.length === 0 && (
                <li className="px-4 py-3 text-xs text-gray-400">
                  登録された科目はありません
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
