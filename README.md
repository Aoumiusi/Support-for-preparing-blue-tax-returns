# Tauri-Blue（仮） — 青色申告支援ソフトウェア

個人事業主向けの青色申告（65万円控除）支援デスクトップアプリケーションです。
複式簿記による記帳と、貸借対照表・損益計算書の自動生成をローカル環境で完結させます。

## 特徴

- **複式簿記対応** — 借方・貸方の自動バリデーションで記帳ミスを防止
- **決算書自動生成** — 損益計算書 (P/L) と貸借対照表 (B/S) をワンクリックで作成
- **完全ローカル** — データはすべて端末内の SQLite に保存。クラウド通信なし
- **クロスプラットフォーム** — Tauri により Windows / macOS / Linux で動作

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Frontend | React / TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Rust (Tauri) |
| Database | SQLite (sqlx / tauri-plugin-sql) |

## 主要機能

1. **取引入力** — 仕訳の登録・編集・削除、テンプレート入力
2. **帳簿出力** — 仕訳帳、総勘定元帳、試算表
3. **決算支援** — 損益計算書、貸借対照表、CSV エクスポート
4. **バックアップ** — DB ファイルの手動バックアップ / リストア

## ドキュメント

- [設計書 (docs/design.md)](docs/design.md) — アーキテクチャ、DB スキーマ、API 設計、ロードマップ

## 開発の始め方

```bash
# 前提条件
# - Rust (rustup)
# - Node.js (v18+)
# - Tauri CLI

# プロジェクト作成
npm create tauri-app

# 開発サーバー起動
npm run tauri dev

# ビルド
npm run tauri build
```

## ライセンス

未定
