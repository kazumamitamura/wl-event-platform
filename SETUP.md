# セットアップガイド

## 1. 前提条件

- Node.js 18.17以上
- npm
- Supabaseアカウント

## 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスし、新しいプロジェクトを作成
2. プロジェクト設定からAPI情報を取得:
   - Project URL
   - Anon/Public Key

## 3. データベースのセットアップ

1. Supabaseのダッシュボードで「SQL Editor」を開く
2. `supabase/schema.sql` の内容をコピー&ペーストして実行
3. (オプション) サンプルデータを投入する場合は `supabase/seed.sql` も実行

## 4. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成:

```bash
cp .env.local.example .env.local
```

`.env.local` を編集してSupabaseの認証情報を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 5. 依存関係のインストール

```bash
npm install
```

## 6. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## 7. 初回ログイン

### 運営アカウントの作成

1. http://localhost:3000/auth/signup にアクセス
2. 以下の情報で登録:
   - 氏名: 運営太郎
   - メールアドレス: admin@example.com
   - パスワード: (任意・6文字以上)
   - カテゴリ: **運営**

3. 登録後、運営画面 http://localhost:3000/admin にアクセス可能

### 選手アカウントの作成

1. http://localhost:3000/auth/signup にアクセス
2. 以下の情報で登録:
   - 氏名: 山田太郎
   - メールアドレス: athlete@example.com
   - パスワード: (任意・6文字以上)
   - カテゴリ: **社会人選手**

3. 登録後、選手画面 http://localhost:3000/athlete にアクセス可能

## 8. サンプルデータでの動作確認

`supabase/seed.sql` を実行した場合:

1. **選手画面** (http://localhost:3000/athlete)
   - 「第1回サンプル大会」を選択
   - 「山田太郎」を選手として選択
   - 待機本数が表示される

2. **運営画面** (http://localhost:3000/admin)
   - 「第1回サンプル大会」を選択
   - 試技順が表示される
   - 「成功」「失敗」ボタンで結果入力が可能
   - 選手画面の待機本数がリアルタイムで更新される

## トラブルシューティング

### データベース接続エラー

- `.env.local` の設定が正しいか確認
- Supabaseプロジェクトが起動しているか確認

### RLS (Row Level Security) エラー

- `supabase/schema.sql` が正しく実行されているか確認
- RLSポリシーが正しく設定されているか確認

### 認証エラー

- メールアドレスの確認が必要な場合があります
- Supabaseの認証設定で「Confirm email」を無効化すると、開発時は便利です

## 本番デプロイ

### Vercelへのデプロイ

1. GitHubリポジトリにコードをプッシュ
2. Vercelで「New Project」を作成
3. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. デプロイ実行

## 次のステップ

- 大会データの追加
- 選手データのインポート機能
- 重量変更機能の実装
- レポート機能の追加
