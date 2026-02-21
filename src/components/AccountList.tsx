import { useState } from "react";
import type { Account } from "../types";
import * as api from "../lib/api";
import { accountHelpMap, classificationHelp } from "../lib/accountHelp";

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
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);

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

      {/* 勘定科目の概要説明 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-800">
          勘定科目とは？
        </h3>
        <p className="text-xs leading-relaxed text-blue-700">
          勘定科目とは、お金の動きを分類するための「ラベル」です。
          たとえば「電車に乗った」→「旅費交通費」、「事務所の家賃を払った」→「地代家賃」のように、
          どんな理由でお金が動いたかを記録します。
          各科目名をクリックすると、詳しい説明と使用例が表示されます。
        </p>
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
              {classificationHelp[g.classification] && (
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  {classificationHelp[g.classification]}
                </p>
              )}
            </div>
            <ul className="divide-y divide-gray-50">
              {g.items.map((a) => {
                const help = accountHelpMap[a.code];
                const isExpanded = expandedAccount === a.id;
                return (
                  <li key={a.id} className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAccount(isExpanded ? null : a.id)
                      }
                      className="flex w-full items-center text-left text-sm hover:bg-gray-50 rounded -mx-1 px-1 transition"
                    >
                      <span className="font-mono text-xs text-gray-400 mr-2">
                        {a.code}
                      </span>
                      <span className="flex-1 font-medium">{a.name}</span>
                      {help && (
                        <span
                          className={`ml-1 text-xs text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        >
                          ▼
                        </span>
                      )}
                    </button>
                    {help && isExpanded && (
                      <div className="mt-2 ml-8 rounded bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-600">
                        <p>{help.description}</p>
                        {help.examples.length > 0 && (
                          <div className="mt-1.5">
                            <span className="font-medium text-gray-500">
                              使用例：
                            </span>
                            <ul className="mt-0.5 list-disc pl-4 text-gray-500">
                              {help.examples.map((ex, i) => (
                                <li key={i}>{ex}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
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
