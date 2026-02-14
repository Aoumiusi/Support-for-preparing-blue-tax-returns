/** 整数（円）を ¥1,234 形式にフォーマット */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/** 今日の日付を YYYY-MM-DD 形式で返す */
export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 現在の年を返す */
export function currentYear(): number {
  return new Date().getFullYear();
}
