import { useState } from "react";
import type { Account } from "../types";
import { todayString } from "../lib/format";
import * as api from "../lib/api";

interface Props {
  accounts: Account[];
  onSaved: () => void;
}

/**
 * かんたん入力用のプリセット定義
 * ユーザーは項目を選んで日付と金額を入れるだけで仕訳が自動生成される
 */
interface SimplePreset {
  label: string;
  description: string;
  category: "monthly" | "common" | "income";
  debitCode: number;
  creditCode: number;
  defaultDescription: string;
  descriptionPlaceholder: string;
}

const presets: SimplePreset[] = [
  // ── 毎月の固定費 ──
  {
    label: "家賃（振込）",
    description: "事務所・店舗の家賃を口座振込で支払い",
    category: "monthly",
    debitCode: 5300,
    creditCode: 1112,
    defaultDescription: "家賃",
    descriptionPlaceholder: "例: ○月分 事務所家賃",
  },
  {
    label: "電気代",
    description: "電気料金を口座振替で支払い",
    category: "monthly",
    debitCode: 5700,
    creditCode: 1112,
    defaultDescription: "電気代",
    descriptionPlaceholder: "例: ○月分 電気代",
  },
  {
    label: "ガス・水道代",
    description: "ガス・水道料金を口座振替で支払い",
    category: "monthly",
    debitCode: 5700,
    creditCode: 1112,
    defaultDescription: "ガス・水道代",
    descriptionPlaceholder: "例: ○月分 水道代",
  },
  {
    label: "通信費（携帯・ネット）",
    description: "携帯電話やインターネット回線の月額料金を口座振替で支払い",
    category: "monthly",
    debitCode: 5400,
    creditCode: 1112,
    defaultDescription: "通信費",
    descriptionPlaceholder: "例: ○月分 携帯電話料金",
  },
  {
    label: "借入金の返済",
    description: "銀行などへの借入金を口座振替で返済",
    category: "monthly",
    debitCode: 2200,
    creditCode: 1112,
    defaultDescription: "借入金返済",
    descriptionPlaceholder: "例: ○月分 事業ローン返済",
  },

  // ── よくある経費 ──
  {
    label: "交通費（現金）",
    description: "電車・バス・タクシーなどの交通費を現金で支払い",
    category: "common",
    debitCode: 5500,
    creditCode: 1111,
    defaultDescription: "交通費",
    descriptionPlaceholder: "例: △△駅まで電車代",
  },
  {
    label: "交通費（口座）",
    description: "交通費をICカードチャージや口座引落で支払い",
    category: "common",
    debitCode: 5500,
    creditCode: 1112,
    defaultDescription: "交通費",
    descriptionPlaceholder: "例: ICカードチャージ",
  },
  {
    label: "消耗品（現金）",
    description: "文房具やUSBメモリなど少額の消耗品を現金で購入",
    category: "common",
    debitCode: 5600,
    creditCode: 1111,
    defaultDescription: "消耗品購入",
    descriptionPlaceholder: "例: コピー用紙、ボールペン",
  },
  {
    label: "消耗品（口座）",
    description: "消耗品をネット通販などで購入し口座から支払い",
    category: "common",
    debitCode: 5600,
    creditCode: 1112,
    defaultDescription: "消耗品購入",
    descriptionPlaceholder: "例: Amazon ○○購入",
  },
  {
    label: "接待・会食",
    description: "取引先との飲食代を現金で支払い",
    category: "common",
    debitCode: 5800,
    creditCode: 1111,
    defaultDescription: "接待交際費",
    descriptionPlaceholder: "例: ○○社 △△氏と会食",
  },
  {
    label: "外注費（振込）",
    description: "外部業者やフリーランスへの委託費用を口座振込で支払い",
    category: "common",
    debitCode: 5210,
    creditCode: 1112,
    defaultDescription: "外注費",
    descriptionPlaceholder: "例: ○○氏 デザイン制作費",
  },
  {
    label: "書籍・資料",
    description: "業務に必要な書籍や資料を現金で購入",
    category: "common",
    debitCode: 5930,
    creditCode: 1111,
    defaultDescription: "新聞図書費",
    descriptionPlaceholder: "例: ○○入門書",
  },
  {
    label: "振込手数料",
    description: "銀行の振込手数料が口座から引かれた",
    category: "common",
    debitCode: 5940,
    creditCode: 1112,
    defaultDescription: "振込手数料",
    descriptionPlaceholder: "例: ○月○日分 振込手数料",
  },
  {
    label: "自腹立替（事業主借）",
    description: "個人のお金で事業の経費を立て替えた場合",
    category: "common",
    debitCode: 5600,
    creditCode: 3300,
    defaultDescription: "立替（事業主借）",
    descriptionPlaceholder: "例: 個人カードで○○購入",
  },

  // ── 売上・入金 ──
  {
    label: "売上（振込入金）",
    description: "お客さんからの代金が口座に振り込まれた",
    category: "income",
    debitCode: 1112,
    creditCode: 4100,
    defaultDescription: "売上入金",
    descriptionPlaceholder: "例: ○○社 △月分報酬",
  },
  {
    label: "売上（現金入金）",
    description: "お客さんから現金で代金を受け取った",
    category: "income",
    debitCode: 1111,
    creditCode: 4100,
    defaultDescription: "売上入金",
    descriptionPlaceholder: "例: 店頭売上",
  },
  {
    label: "売上（売掛発生）",
    description: "請求書を送ったが、まだ入金されていない（ツケ）",
    category: "income",
    debitCode: 1131,
    creditCode: 4100,
    defaultDescription: "売上計上（売掛）",
    descriptionPlaceholder: "例: ○○社 △月分請求",
  },
  {
    label: "売掛金の回収",
    description: "以前のツケが口座に振り込まれた",
    category: "income",
    debitCode: 1112,
    creditCode: 1131,
    defaultDescription: "売掛金回収",
    descriptionPlaceholder: "例: ○○社 △月分入金",
  },
];

const categoryLabels: Record<SimplePreset["category"], string> = {
  monthly: "毎月の固定費",
  common: "よくある経費",
  income: "売上・入金",
};

const categoryDescriptions: Record<SimplePreset["category"], string> = {
  monthly: "家賃や光熱費など、毎月発生する定期的な支払い",
  common: "日常的にかかる経費や購入",
  income: "売上の入金や売掛金の処理",
};

const categories: SimplePreset["category"][] = [
  "monthly",
  "common",
  "income",
];

export default function SimpleEntryForm({ accounts, onSaved }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<SimplePreset | null>(
    null,
  );
  const [date, setDate] = useState(todayString());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  function findAccountByCode(code: number): Account | undefined {
    return accounts.find((a) => a.code === code);
  }

  function selectPreset(preset: SimplePreset) {
    setSelectedPreset(preset);
    setDescription(preset.defaultDescription);
    setError("");
    setSuccessMessage("");
  }

  function clearSelection() {
    setSelectedPreset(null);
    setAmount("");
    setDescription("");
    setError("");
    setSuccessMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPreset) return;
    setError("");
    setSuccessMessage("");

    const amountNum = parseInt(amount, 10);
    if (!date) {
      setError("日付を入力してください");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("金額は1円以上の整数を入力してください");
      return;
    }

    const debit = findAccountByCode(selectedPreset.debitCode);
    const credit = findAccountByCode(selectedPreset.creditCode);
    if (!debit || !credit) {
      setError(
        "必要な勘定科目が見つかりません。勘定科目一覧から科目が登録されているか確認してください。",
      );
      return;
    }

    setSaving(true);
    try {
      await api.addEntry({
        date,
        debitAccountId: debit.id,
        debitAmount: amountNum,
        creditAccountId: credit.id,
        creditAmount: amountNum,
        description: description || selectedPreset.defaultDescription,
      });

      const debitName = debit.name;
      const creditName = credit.name;
      setSuccessMessage(
        `登録しました: ${debitName} / ${creditName}  ¥${amountNum.toLocaleString()}`,
      );
      setAmount("");
      setDescription(selectedPreset.defaultDescription);
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">かんたん入力</h2>
        <p className="mt-1 text-xs text-gray-500">
          項目を選んで日付と金額を入力するだけ。借方・貸方の知識は不要です。
        </p>
      </div>

      {/* プリセット一覧 */}
      {!selectedPreset && (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  {categoryLabels[cat]}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {categoryDescriptions[cat]}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {presets
                  .filter((p) => p.category === cat)
                  .map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => selectPreset(preset)}
                      className="rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-primary-300 hover:bg-primary-50 transition"
                    >
                      <span className="block text-sm font-medium text-gray-800">
                        {preset.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-gray-500">
                        {preset.description}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 入力フォーム */}
      {selectedPreset && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                {selectedPreset.label}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedPreset.description}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 transition"
            >
              項目を変更
            </button>
          </div>

          {/* 自動設定される仕訳の説明 */}
          <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-xs text-gray-500">
            自動設定：
            <span className="font-medium text-gray-700">
              {(() => {
                const d = findAccountByCode(selectedPreset.debitCode);
                const c = findAccountByCode(selectedPreset.creditCode);
                return `${d?.name ?? "?"} / ${c?.name ?? "?"}`;
              })()}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  autoFocus
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* 摘要 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  メモ（任意）
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={selectedPreset.descriptionPlaceholder}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}
            {successMessage && (
              <p className="text-sm font-medium text-green-600">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {saving ? "保存中..." : "登録する"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
