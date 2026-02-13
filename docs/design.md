# 青色申告ソフトウェア設計書 (Tauri + SQLite)

## 1. プロジェクト概要

個人事業主が最大65万円の**青色申告特別控除**を受けるために必要な「**複式簿記**」による記帳と、「**貸借対照表・損益計算書**」の自動生成をローカル環境で完結させるデスクトップアプリケーション。

### 想定ユーザー

- 個人事業主・フリーランス
- 青色申告（65万円控除）を行いたい方

### 主な価値提案

- クラウド不要：全データがローカルに保存されるためプライバシーを確保
- 複式簿記の自動バリデーションにより記帳ミスを防止
- 決算書（P/L・B/S）の自動生成で確定申告をサポート

---

## 2. システムアーキテクチャ

Tauri を採用し、フロントエンドの柔軟性と Rust の堅牢性を両立させます。

```
┌─────────────────────────────────────────────┐
│              Desktop Application             │
│  ┌────────────────────────────────────────┐  │
│  │         Frontend (WebView)             │  │
│  │  React / Next.js / Vue.js (TypeScript) │  │
│  │  Tailwind CSS + shadcn/ui              │  │
│  └──────────────┬─────────────────────────┘  │
│                 │ Tauri Commands (IPC)        │
│  ┌──────────────▼─────────────────────────┐  │
│  │         Backend (Rust / Tauri)          │  │
│  │  複式簿記バリデーション                    │  │
│  │  決算集計ロジック                         │  │
│  │  CSV エクスポート                         │  │
│  └──────────────┬─────────────────────────┘  │
│                 │ sqlx / tauri-plugin-sql     │
│  ┌──────────────▼─────────────────────────┐  │
│  │         Database (SQLite)               │  │
│  │  ローカルファイル (appdata 配下)           │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 技術スタック

| レイヤー | 技術 | 備考 |
|---|---|---|
| Frontend | React / Next.js / Vue.js (TypeScript) | UIライブラリ: Tailwind CSS, shadcn/ui 等 |
| Backend | Rust (Tauri) | ビジネスロジック: 複式簿記バリデーション、決算集計 |
| Database | SQLite | 永続化: ローカルファイル（appdata 配下） |
| DB接続 | sqlx または tauri-plugin-sql | 型安全なクエリ実行 |

---

## 3. データベース設計 (Schema)

### 3.1 勘定科目テーブル (`accounts`)

| カラム名 | 型 | 説明 |
|---|---|---|
| `id` | INTEGER (PK) | 内部ID |
| `code` | INTEGER | 勘定科目コード (例: 1111) |
| `name` | TEXT | 科目名 (例: 普通預金) |
| `classification` | TEXT | 分類 (`資産` / `負債` / `純資産` / `収益` / `費用`) |

```sql
CREATE TABLE accounts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            INTEGER NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    classification  TEXT    NOT NULL CHECK (
                        classification IN ('資産', '負債', '純資産', '収益', '費用')
                    )
);
```

#### 初期データ例（主要勘定科目）

| code | name | classification |
|------|------|----------------|
| 1111 | 現金 | 資産 |
| 1112 | 普通預金 | 資産 |
| 1131 | 売掛金 | 資産 |
| 1500 | 車両運搬具 | 資産 |
| 2111 | 買掛金 | 負債 |
| 2112 | 未払金 | 負債 |
| 3100 | 元入金 | 純資産 |
| 4100 | 売上高 | 収益 |
| 5100 | 仕入高 | 費用 |
| 5200 | 給料賃金 | 費用 |
| 5300 | 地代家賃 | 費用 |
| 5400 | 通信費 | 費用 |
| 5500 | 旅費交通費 | 費用 |
| 5600 | 消耗品費 | 費用 |
| 5700 | 水道光熱費 | 費用 |
| 5800 | 接待交際費 | 費用 |
| 5900 | 減価償却費 | 費用 |

### 3.2 仕訳帳テーブル (`journal_entries`)

複式簿記の原則に基づき、1つの取引に対して借方・貸方を記録します。

| カラム名 | 型 | 説明 |
|---|---|---|
| `id` | INTEGER (PK) | 内部ID |
| `date` | TEXT | 取引日 (YYYY-MM-DD) |
| `debit_account_id` | INTEGER (FK) | 借方 科目ID |
| `debit_amount` | INTEGER | 借方 金額（円） |
| `credit_account_id` | INTEGER (FK) | 貸方 科目ID |
| `credit_amount` | INTEGER | 貸方 金額（円） |
| `description` | TEXT | 摘要 |
| `created_at` | DATETIME | 作成日時 |

```sql
CREATE TABLE journal_entries (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    date                TEXT     NOT NULL,            -- 取引日 (YYYY-MM-DD)
    debit_account_id    INTEGER  NOT NULL,            -- 借方 科目ID
    debit_amount        INTEGER  NOT NULL,            -- 借方 金額（円、整数）
    credit_account_id   INTEGER  NOT NULL,            -- 貸方 科目ID
    credit_amount       INTEGER  NOT NULL,            -- 貸方 金額（円、整数）
    description         TEXT,                         -- 摘要
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (debit_account_id)  REFERENCES accounts(id),
    FOREIGN KEY (credit_account_id) REFERENCES accounts(id),
    CHECK (debit_amount = credit_amount),             -- 複式簿記: 借方 = 貸方
    CHECK (debit_amount > 0)                          -- 金額は正の整数
);
```

### 3.3 ER 図

```
accounts                    journal_entries
┌──────────────────┐       ┌──────────────────────┐
│ id (PK)          │◄──┐   │ id (PK)              │
│ code             │   ├───│ debit_account_id (FK) │
│ name             │   ├───│ credit_account_id(FK) │
│ classification   │   │   │ date                  │
└──────────────────┘   │   │ debit_amount          │
                       │   │ credit_amount         │
                       │   │ description           │
                       │   │ created_at            │
                       │   └──────────────────────┘
```

---

## 4. 主要機能

### 4.1 取引入力 (Journaling)

- **複式簿記バリデーション**: 借方合計 = 貸方合計 であることを保存時にチェック
- **テンプレート入力**: よくある取引（家賃の支払い、売上の入金など）を1クリックで入力
- **日付バリデーション**: 会計年度内（1月1日〜12月31日）の日付のみ許可
- **科目検索**: インクリメンタルサーチによる科目の素早い選択

#### 入力フロー

```
1. 取引日を選択
2. 借方科目をドロップダウンから選択
3. 借方金額を入力
4. 貸方科目をドロップダウンから選択
5. 貸方金額を入力（借方と同額が自動入力される）
6. 摘要を入力
7. 保存 → バリデーション → DB に INSERT
```

### 4.2 帳簿出力 (Reports)

| 帳簿名 | 説明 |
|---|---|
| **仕訳帳** | 全取引の時系列リスト |
| **総勘定元帳** | 科目ごとの取引推移と残高 |
| **試算表 (T/B)** | 月次/年次の残高確認 |

### 4.3 決算支援 (Final Accounts)

#### 損益計算書 (P/L)

期間内の収益と費用を集計し、当期純利益（損失）を算出します。

```
損益計算書
──────────────────────────
【収益の部】
  売上高           ¥XXX,XXX
──────────────────────────
【費用の部】
  仕入高           ¥XXX,XXX
  給料賃金         ¥XXX,XXX
  地代家賃         ¥XXX,XXX
  通信費           ¥XXX,XXX
  ...
  費用合計         ¥XXX,XXX
──────────────────────────
  当期純利益       ¥XXX,XXX
```

#### 貸借対照表 (B/S)

期末時点の資産・負債・純資産の状態を表示します。

```
貸借対照表
──────────────────────────────────────
【資産の部】          │【負債の部】
  現金     ¥XXX,XXX  │  買掛金   ¥XXX,XXX
  普通預金 ¥XXX,XXX  │  未払金   ¥XXX,XXX
  売掛金   ¥XXX,XXX  │  負債合計 ¥XXX,XXX
  ...                │──────────────────
  資産合計 ¥XXX,XXX  │【純資産の部】
                     │  元入金   ¥XXX,XXX
                     │  当期純利益¥XXX,XXX
                     │  純資産合計¥XXX,XXX
──────────────────────────────────────
  合計     ¥XXX,XXX  │  合計     ¥XXX,XXX
```

---

## 5. Tauri コマンド設計 (Rust Backend API)

フロントエンドから呼び出す Tauri コマンドの一覧です。

### 5.1 勘定科目

```rust
#[tauri::command]
fn get_accounts() -> Result<Vec<Account>, String>

#[tauri::command]
fn add_account(code: i32, name: String, classification: String) -> Result<Account, String>
```

### 5.2 仕訳

```rust
#[tauri::command]
fn add_entry(
    date: String,
    debit_account_id: i64,
    debit_amount: i64,
    credit_account_id: i64,
    credit_amount: i64,
    description: Option<String>,
) -> Result<JournalEntry, String>

#[tauri::command]
fn get_entries(year: i32, month: Option<i32>) -> Result<Vec<JournalEntry>, String>

#[tauri::command]
fn delete_entry(id: i64) -> Result<(), String>

#[tauri::command]
fn update_entry(entry: JournalEntry) -> Result<JournalEntry, String>
```

### 5.3 集計・レポート

```rust
#[tauri::command]
fn get_trial_balance(year: i32, month: Option<i32>) -> Result<TrialBalance, String>

#[tauri::command]
fn get_profit_loss(year: i32) -> Result<ProfitLoss, String>

#[tauri::command]
fn get_balance_sheet(year: i32) -> Result<BalanceSheet, String>

#[tauri::command]
fn export_csv(report_type: String, year: i32) -> Result<String, String>
```

---

## 6. 技術的な注意点

### 6.1 通貨計算

> **浮動小数点の禁止**: 通貨計算に `f64` は使用せず、すべて `i64`（整数、単位：円）で処理すること。

```rust
// NG
let amount: f64 = 1000.5;

// OK
let amount: i64 = 1000; // 単位: 円
```

### 6.2 データバックアップ

- ユーザーが手動で `.db` ファイルをコピーして保存できる機能を提供
- アプリ内に「バックアップ」ボタンを設置し、指定フォルダへのコピーを実行
- バックアップファイル名: `tauri-blue_backup_YYYYMMDD_HHMMSS.db`

### 6.3 会計年度

- 個人事業主の会計年度は **1月1日〜12月31日** （暦年）
- 年度選択UIを設け、過年度のデータも参照可能にする

### 6.4 セキュリティ

- SQL インジェクション対策: パラメータバインディングを必ず使用
- Tauri の CSP (Content Security Policy) を適切に設定
- ローカルファイルアクセスの最小権限化

---

## 7. 開発ロードマップ

### Phase 1: 環境構築

- [ ] `rustup`, `node.js`, `tauri-cli` のセットアップ
- [ ] プロジェクト初期化 (`npm create tauri-app`)
- [ ] 開発ツールチェインの設定 (ESLint, Prettier, Clippy)

### Phase 2: データ基盤実装

- [ ] SQLite データベースの初期化スクリプト作成
- [ ] `accounts` テーブルの CRUD 実装
- [ ] `journal_entries` テーブルの CRUD 実装
- [ ] Rust 側での Tauri コマンド実装 (`add_entry`, `get_entries`)

### Phase 3: UI 実装

- [ ] 仕訳入力フォームの作成
- [ ] 勘定科目選択ドロップダウンの実装
- [ ] 仕訳帳一覧画面の作成
- [ ] テンプレート入力機能

### Phase 4: 集計ロジック

- [ ] 試算表 (T/B) の集計アルゴリズム実装
- [ ] 貸借対照表 (B/S) の自動生成
- [ ] 損益計算書 (P/L) の自動生成
- [ ] CSV エクスポート機能の追加

### Phase 5: 品質向上

- [ ] バックアップ / リストア機能
- [ ] データバリデーションの強化
- [ ] UI/UX の改善・レスポンシブ対応
- [ ] 単体テスト・結合テストの整備

---

## 8. ライセンス

（未定 — プロジェクト方針に応じて決定）
