import { useState, useEffect, useCallback } from "react";
import type { FixedAsset } from "../types";
import { formatYen } from "../lib/format";
import * as api from "../lib/api";

// 主要な耐用年数と定額法の償却率 (×10000)
const usefulLifeOptions = [
  { years: 2, rate: 5000, label: "2年 (0.500)" },
  { years: 3, rate: 3334, label: "3年 (0.334)" },
  { years: 4, rate: 2500, label: "4年 (0.250)" },
  { years: 5, rate: 2000, label: "5年 (0.200)" },
  { years: 6, rate: 1667, label: "6年 (0.167)" },
  { years: 8, rate: 1250, label: "8年 (0.125)" },
  { years: 10, rate: 1000, label: "10年 (0.100)" },
  { years: 15, rate: 667, label: "15年 (0.067)" },
  { years: 20, rate: 500, label: "20年 (0.050)" },
  { years: 22, rate: 455, label: "22年 (建物木造 0.046)" },
  { years: 34, rate: 294, label: "34年 (建物鉄骨 0.030)" },
  { years: 47, rate: 213, label: "47年 (建物RC 0.022)" },
];

export default function FixedAssetList() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [selectedLife, setSelectedLife] = useState(usefulLifeOptions[4]); // default 5年
  const [accumulatedDep, setAccumulatedDep] = useState("0");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.getFixedAssets().then(setAssets).catch(console.error);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cost = parseInt(acquisitionCost, 10);
    const accDep = parseInt(accumulatedDep, 10);
    if (!name.trim()) { setError("資産名を入力してください"); return; }
    if (!acquisitionDate) { setError("取得年月日を入力してください"); return; }
    if (isNaN(cost) || cost <= 0) { setError("取得価額は1円以上を入力してください"); return; }
    try {
      await api.addFixedAsset({
        name: name.trim(),
        acquisitionDate,
        acquisitionCost: cost,
        usefulLife: selectedLife.years,
        depreciationMethod: "定額法",
        depreciationRate: selectedLife.rate,
        accumulatedDep: isNaN(accDep) ? 0 : accDep,
        memo,
      });
      setName(""); setAcquisitionDate(""); setAcquisitionCost(""); setAccumulatedDep("0"); setMemo("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("この固定資産を削除しますか？")) return;
    try {
      await api.deleteFixedAsset(id);
      load();
    } catch (err) {
      alert(String(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">固定資産台帳</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
        >
          {showForm ? "閉じる" : "資産を追加"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">資産名称</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ノートPC" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">取得年月日</label>
              <input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">取得価額（円）</label>
              <input type="number" min="1" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} placeholder="0" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">耐用年数・償却率</label>
              <select
                value={selectedLife.years}
                onChange={(e) => {
                  const opt = usefulLifeOptions.find((o) => o.years === Number(e.target.value));
                  if (opt) setSelectedLife(opt);
                }}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {usefulLifeOptions.map((o) => (
                  <option key={o.years} value={o.years}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">前年末償却累計額（円）</label>
              <input type="number" min="0" value={accumulatedDep} onChange={(e) => setAccumulatedDep(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">備考</label>
              <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 transition">追加</button>
        </form>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-3 py-2">資産名</th>
              <th className="px-3 py-2">取得日</th>
              <th className="px-3 py-2 text-right">取得価額</th>
              <th className="px-3 py-2">償却方法</th>
              <th className="px-3 py-2 text-right">耐用年数</th>
              <th className="px-3 py-2 text-right">償却累計</th>
              <th className="px-3 py-2 text-right">帳簿価額</th>
              <th className="px-3 py-2">備考</th>
              <th className="px-3 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-400">固定資産が登録されていません</td></tr>
            ) : assets.map((a) => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{a.acquisition_date}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatYen(a.acquisition_cost)}</td>
                <td className="px-3 py-2 text-xs">{a.depreciation_method}</td>
                <td className="px-3 py-2 text-right">{a.useful_life}年</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatYen(a.accumulated_dep)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{formatYen(a.acquisition_cost - a.accumulated_dep)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{a.memo}</td>
                <td className="px-3 py-2">
                  <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:text-red-700">削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
