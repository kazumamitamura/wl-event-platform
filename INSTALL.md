# インストール手順

## 手動でnpm installを実行

プロジェクトディレクトリで以下のコマンドを実行してください：

```bash
cd "C:\Users\PC_User\Desktop\アプリ\wl-event-platform"
npm install
```

## インストールされるパッケージ

### 本番依存関係
- `next@14.2.5` - Next.jsフレームワーク
- `react@^18.3.1` - React
- `react-dom@^18.3.1` - React DOM
- `@supabase/supabase-js@^2.39.7` - Supabaseクライアント
- `@supabase/ssr@^0.1.0` - Supabase SSRヘルパー
- `zustand@^4.5.2` - 状態管理
- `date-fns@^3.3.1` - 日付ユーティリティ

### 開発依存関係
- `typescript@^5.4.2`
- `@types/node@^20.11.24`
- `@types/react@^18.2.61`
- `@types/react-dom@^18.2.19`
- `tailwindcss@^3.4.1`
- `postcss@^8.4.35`
- `autoprefixer@^10.4.18`

## インストール後の確認

```bash
npm run dev
```

開発サーバーが http://localhost:3000 で起動します。

## トラブルシューティング

### npm installが失敗する場合

1. Node.jsのバージョンを確認:
```bash
node --version
```
Node.js 18.17以上が必要です。

2. npm cacheをクリア:
```bash
npm cache clean --force
npm install
```

3. node_modulesを削除して再インストール:
```bash
Remove-Item -Recurse -Force node_modules
npm install
```

### PowerShellで文字化けする場合

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### ポート3000が使用中の場合

```bash
npm run dev -- -p 3001
```
