# データベースセットアップガイド

## ⚠️ 重要: wl_ プレフィックスについて

このアプリは **1つの Supabase プロジェクト（Master-Portfolio-DB）を複数アプリで共有** する前提で設計されています。
他アプリとの衝突を避けるため、全テーブルに `wl_` プレフィックスを使用しています。

| テーブル名 | 用途 |
|---|---|
| `wl_profiles` | ユーザー情報（Auth 連携） |
| `wl_usage_logs` | 利用ログ |
| `wl_competitions` | 大会情報 |
| `wl_athletes` | 選手エントリー |
| `wl_attempts` | 試技データ（リアルタイム同期） |

トリガー関数: `wl_handle_new_user()` / トリガー: `wl_on_auth_user_created`
→ 他アプリの `handle_new_user` や `on_auth_user_created` には一切影響しません。

---

## セットアップ手順

### 初回セットアップ
```
1. Supabase SQL Editor で schema-safe.sql を実行
2. seed.sql を実行（サンプルデータ投入）
```

### やり直す場合（全データ削除OK）
```
1. cleanup.sql を実行  — wl_ テーブルだけ削除（他アプリに影響なし）
2. schema-safe.sql を実行
3. seed.sql を実行（オプション）
```

---

## ファイルの説明

| ファイル | 説明 |
|---|---|
| `schema-safe.sql` | `CREATE TABLE IF NOT EXISTS` 使用。何度でも安全に実行可能 |
| `cleanup.sql` | `wl_` テーブルのみ削除。他アプリのテーブルには触れない |
| `seed.sql` | サンプル大会＋選手5名＋試技データ |

---

## トラブルシューティング

### Q: 新規登録できない / Invalid login credentials
A: 以下を確認してください：
1. `schema-safe.sql` が正しく実行されている（`wl_profiles` テーブルが存在する）
2. Supabase Dashboard → Authentication → Providers → Email
   - **Confirm email** を **OFF** にする（開発中は推奨）
3. 既存ユーザーを Authentication → Users から削除して再登録

### Q: テーブルが正しくあるか確認したい
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'wl_%'
ORDER BY table_name;

-- 期待される結果:
-- wl_athletes
-- wl_attempts
-- wl_competitions
-- wl_profiles
-- wl_usage_logs
```

### Q: トリガーを確認したい
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'wl_%'
ORDER BY trigger_name;

-- 期待される結果:
-- wl_on_auth_user_created  |  users
-- wl_update_athletes       |  wl_athletes
-- wl_update_attempts       |  wl_attempts
-- wl_update_competitions   |  wl_competitions
```

### Q: 他アプリのデータは大丈夫？
A: `wl_` プレフィックスのテーブルしか操作しません。
`cleanup.sql` も `wl_` テーブルだけを削除します。
他アプリの `profiles`, `usage_logs` 等には **一切影響しません**。
