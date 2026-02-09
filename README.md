# ウエイトリフティング競技運営プラットフォーム

ウエイトリフティング大会の進行管理と選手向けリアルタイム待機本数確認システム

## 機能概要

- **運営機能**: 試技順管理、結果入力、自動ソート（バーベル・ローデッド法）
- **選手機能**: リアルタイム待機本数確認、現在のバー重量表示
- **認証**: メール/パスワード認証、カテゴリ別ユーザー管理
- **リアルタイム同期**: Supabase Realtimeによる即時更新

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数設定

`.env.local.example` をコピーして `.env.local` を作成し、Supabaseの認証情報を設定:

```bash
cp .env.local.example .env.local
```

### 3. Supabaseプロジェクトのセットアップ

`supabase/schema.sql` をSupabase SQLエディタで実行してデータベースを初期化します。

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## 技術スタック

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: Zustand
- **Deployment**: Vercel

## プロジェクト構造

```
wl-event-platform/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── admin/             # 運営画面
│   ├── athlete/           # 選手画面
│   └── api/               # API Routes
├── components/            # React コンポーネント
├── lib/                   # ユーティリティ、Supabaseクライアント
├── types/                 # TypeScript型定義
└── supabase/             # データベーススキーマ
```

## ライセンス

MIT
