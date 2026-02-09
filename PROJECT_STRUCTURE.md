# プロジェクト構造

```
wl-event-platform/
│
├── app/                          # Next.js App Router
│   ├── globals.css              # グローバルスタイル
│   ├── layout.tsx               # ルートレイアウト
│   ├── page.tsx                 # ホームページ
│   │
│   ├── auth/                    # 認証ページ
│   │   ├── signin/
│   │   │   └── page.tsx        # サインインページ
│   │   └── signup/
│   │       └── page.tsx        # サインアップページ
│   │
│   ├── admin/                   # 運営画面
│   │   └── page.tsx            # 運営ダッシュボード
│   │
│   ├── athlete/                 # 選手画面
│   │   └── page.tsx            # 選手ダッシュボード
│   │
│   └── api/                     # API Routes
│       └── auth/
│           └── signout/
│               └── route.ts    # サインアウトAPI
│
├── components/                   # Reactコンポーネント
│   ├── AuthProvider.tsx         # 認証プロバイダー
│   ├── Header.tsx               # ヘッダー
│   ├── LoadingSpinner.tsx       # ローディング表示
│   └── ErrorMessage.tsx         # エラーメッセージ
│
├── lib/                         # ユーティリティ
│   ├── supabase/
│   │   ├── client.ts           # Supabaseクライアント（ブラウザ用）
│   │   └── server.ts           # Supabaseクライアント（サーバー用）
│   │
│   ├── store/                  # Zustand状態管理
│   │   ├── auth-store.ts       # 認証ストア
│   │   └── competition-store.ts # 大会ストア
│   │
│   ├── hooks/
│   │   └── useAuth.ts          # 認証カスタムフック
│   │
│   ├── auth.ts                 # 認証ヘルパー
│   └── wait-counter.ts         # 待機本数計算ロジック
│
├── types/                       # TypeScript型定義
│   ├── database.ts             # データベース型
│   └── index.ts                # 型エクスポート
│
├── supabase/                    # Supabase関連
│   ├── schema.sql              # データベーススキーマ
│   └── seed.sql                # サンプルデータ
│
├── public/                      # 静的ファイル
│
├── package.json                # 依存関係
├── tsconfig.json               # TypeScript設定
├── tailwind.config.ts          # Tailwind CSS設定
├── postcss.config.mjs          # PostCSS設定
├── next.config.js              # Next.js設定
│
├── .env.local.example          # 環境変数のテンプレート
├── .gitignore                  # Git除外設定
│
├── README.md                   # プロジェクト概要
├── SETUP.md                    # セットアップガイド
├── INSTALL.md                  # インストール手順
├── FEATURES.md                 # 機能一覧
└── PROJECT_STRUCTURE.md        # このファイル
```

## 主要ファイルの説明

### アプリケーション層

#### `app/page.tsx`
- ホームページ
- 選手用/運営用へのナビゲーション

#### `app/auth/signin/page.tsx`
- サインインフォーム
- メール/パスワード認証

#### `app/auth/signup/page.tsx`
- サインアップフォーム
- カテゴリ選択付き

#### `app/admin/page.tsx`
- 運営画面
- 試技順表示
- 結果入力機能
- リアルタイム同期

#### `app/athlete/page.tsx`
- 選手画面
- 待機本数表示
- 現在のバー重量表示
- 次の試技順表示

### ビジネスロジック層

#### `lib/auth.ts`
- サインアップ/サインイン
- ログアウト
- 利用ログ記録

#### `lib/wait-counter.ts`
- 待機本数計算
- 試技順ソート（バーベル・ローデッド法）
- 次の試技重量検証

#### `lib/store/auth-store.ts`
- ユーザー状態管理
- プロフィール管理

#### `lib/store/competition-store.ts`
- 大会データ管理
- 選手データ管理
- 試技データ管理

### データ層

#### `lib/supabase/client.ts`
- ブラウザ用Supabaseクライアント
- Realtime設定

#### `lib/supabase/server.ts`
- サーバーコンポーネント用クライアント
- Cookie管理

#### `types/database.ts`
- 全テーブルの型定義
- Enum型定義
- 拡張型定義

### データベース

#### `supabase/schema.sql`
- テーブル定義
- RLSポリシー
- トリガー
- インデックス

#### `supabase/seed.sql`
- サンプル大会データ
- サンプル選手データ
- サンプル試技データ

## データフロー

### 認証フロー
```
User → SignUp/SignIn → Supabase Auth
                       ↓
                    Trigger
                       ↓
                 profiles table
                       ↓
                  usage_logs
```

### 試技結果入力フロー（運営）
```
Admin → 結果入力 → attempts table更新
                        ↓
                 Realtime通知
                        ↓
            全クライアントに同期
                        ↓
              Athlete画面更新
```

### 待機本数計算フロー（選手）
```
Athlete選択 → calculateWaitCount()
                     ↓
           試技順キュー構築
                     ↓
           重量差による予測
                     ↓
             待機本数表示
```

## 状態管理

### AuthStore
- `user`: 認証ユーザー
- `profile`: プロフィール情報
- `isLoading`: ローディング状態

### CompetitionStore
- `currentCompetition`: 選択中の大会
- `athletes`: 選手一覧
- `attempts`: 試技一覧
- `isLoading`: ローディング状態

## リアルタイム同期

Supabase Realtimeを使用:
- `attempts`テーブルの変更を購読
- 変更時に自動でデータ再読み込み
- 全クライアントに即座に反映
