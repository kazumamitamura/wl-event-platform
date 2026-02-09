# クイックスタートガイド

プロジェクトを最速で動かすための手順です。

## ステップ1: 依存関係のインストール

```bash
cd "C:\Users\PC_User\Desktop\アプリ\wl-event-platform"
npm install
```

> **注意**: PowerShellで文字化けする場合は、コマンドプロンプト（cmd）を使用してください。

## ステップ2: Supabaseプロジェクトの作成

1. https://supabase.com にアクセス
2. 「New Project」をクリック
3. プロジェクト名を入力（例: wl-event-platform）
4. データベースパスワードを設定
5. リージョンを選択（推奨: Northeast Asia (Tokyo)）
6. 「Create new project」をクリック

## ステップ3: データベースのセットアップ

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `supabase/schema.sql` の内容をコピー
3. SQL Editorにペーストして「Run」をクリック
4. (オプション) `supabase/seed.sql` も実行してサンプルデータを投入

## ステップ4: 環境変数の設定

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下をコピー:
   - Project URL
   - anon public key

3. `.env.local` ファイルを作成:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## ステップ5: 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します！

## ステップ6: 最初のユーザーを作成

### 運営アカウント
1. http://localhost:3000/auth/signup にアクセス
2. 情報を入力:
   - 氏名: 運営太郎
   - メール: admin@example.com
   - パスワード: password123
   - **カテゴリ: 運営**
3. 「新規登録」をクリック

### 選手アカウント
1. http://localhost:3000/auth/signup にアクセス
2. 情報を入力:
   - 氏名: 山田太郎
   - メール: athlete@example.com
   - パスワード: password123
   - **カテゴリ: 社会人選手**
3. 「新規登録」をクリック

## ステップ7: サンプルデータで動作確認

サンプルデータを投入した場合:

### 運営画面
1. 運営アカウントでログイン
2. http://localhost:3000/admin にアクセス
3. 「第1回サンプル大会」を選択
4. 試技順が表示される
5. 「進行中にする」「成功」「失敗」ボタンを試す

### 選手画面
1. 選手アカウントでログイン（または別ブラウザで開く）
2. http://localhost:3000/athlete にアクセス
3. 「第1回サンプル大会」を選択
4. 「山田太郎」を選択
5. 待機本数が表示される
6. 運営画面で結果を入力すると、**リアルタイムで更新される**ことを確認

## よくある質問

### Q: メールの確認が必要と表示される
A: Supabaseの設定で「Email confirmations」を無効化してください:
1. Dashboard → Authentication → Settings
2. 「Enable email confirmations」をOFFにする

### Q: ポート3000が使用中
A: 別のポートで起動:
```bash
npm run dev -- -p 3001
```

### Q: データベース接続エラー
A: `.env.local` の設定を確認してください。スペースや改行が入っていないか確認。

### Q: 運営画面にアクセスできない
A: サインアップ時に**カテゴリを「運営」にしたか**確認してください。

## 次のステップ

動作確認ができたら:
1. `FEATURES.md` で全機能を確認
2. `PROJECT_STRUCTURE.md` でコード構造を理解
3. 実際の大会データを作成
4. 必要に応じて機能をカスタマイズ

## トラブルシューティング

詳細は `SETUP.md` と `INSTALL.md` を参照してください。
