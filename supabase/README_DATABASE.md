# データベースセットアップガイド

## エラー: "relation already exists" が出た場合

`ERROR: 42P07: relation "profiles" already exists` というエラーが出た場合、以下の2つの方法で解決できます。

---

## 方法1: クリーンアップしてから再実行（推奨）

### ⚠️ 警告
この方法は**全てのデータを削除**します。開発環境でのみ使用してください。

### 手順

1. **Supabase SQL Editorで `cleanup.sql` を実行**
   ```sql
   -- cleanup.sql の内容をコピーして実行
   ```

2. **確認メッセージが表示される**
   ```
   message: "Cleanup completed. You can now run schema.sql"
   ```

3. **`schema.sql` を実行**
   ```sql
   -- schema.sql の内容をコピーして実行
   ```

4. **（オプション）サンプルデータを投入**
   ```sql
   -- seed.sql の内容をコピーして実行
   ```

---

## 方法2: Safe版スキーマを使用（簡単）

既存のテーブルがあっても安全に実行できるバージョンです。

### 手順

1. **`schema-safe.sql` を実行**
   - Supabase SQL Editorを開く
   - `schema-safe.sql` の内容をコピー＆ペースト
   - 「Run」をクリック

2. **成功メッセージを確認**
   ```
   message: "Schema setup completed successfully!"
   ```

### この方法の特徴
- ✅ 既存のテーブルは上書きされない
- ✅ 新しいポリシーやトリガーは更新される
- ✅ データは保持される
- ⚠️ テーブル構造の変更は反映されない

---

## ファイルの説明

### `schema.sql`
- オリジナルのスキーマファイル
- 初回セットアップ用
- テーブルが存在すると失敗する

### `schema-safe.sql`
- 安全版スキーマファイル
- `CREATE TABLE IF NOT EXISTS` を使用
- 既存テーブルがあっても実行可能
- ポリシーとトリガーは更新される

### `cleanup.sql`
- クリーンアップ用スクリプト
- 全テーブルとデータを削除
- 開発環境専用

### `seed.sql`
- サンプルデータ投入用
- 5人の選手と1つの大会
- 動作確認に便利

---

## 推奨フロー

### 初回セットアップ
```
1. schema.sql を実行
2. seed.sql を実行（オプション）
```

### スキーマ更新時
```
1. cleanup.sql を実行
2. schema.sql を実行
3. seed.sql を実行（必要なら）
```

### エラーが出た場合
```
1. schema-safe.sql を実行
```

---

## トラブルシューティング

### Q: cleanup.sqlでもエラーが出る
A: 以下を試してください：
1. Supabase Dashboard → Database → Tables
2. 手動で各テーブルを削除
3. もう一度 cleanup.sql を実行

### Q: RLSポリシーエラーが出る
A: `schema-safe.sql` は既存ポリシーを削除してから再作成します。
   - `DROP POLICY IF EXISTS ...`
   - `CREATE POLICY ...`

### Q: トリガーが動作しない
A: トリガーは `schema-safe.sql` で再作成されます。
   ユーザー登録時にプロフィールが作成されない場合：
   1. SQL Editorで確認：
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
   2. 存在しない場合は `schema-safe.sql` を再実行

### Q: データを残したままスキーマを更新したい
A: マイグレーション用のSQLを個別に作成する必要があります。
   例：新しいカラムを追加
   ```sql
   ALTER TABLE athletes ADD COLUMN IF NOT EXISTS team TEXT;
   ```

---

## 実行順序の例

### ケース1: 完全に初めて
```sql
-- 1. schema.sql
-- 2. seed.sql (オプション)
```

### ケース2: 既にテーブルがある（データは削除してOK）
```sql
-- 1. cleanup.sql
-- 2. schema.sql
-- 3. seed.sql (オプション)
```

### ケース3: 既にテーブルがある（データは保持したい）
```sql
-- 1. schema-safe.sql のみ
```

---

## 確認方法

スキーマが正しくセットアップされたか確認：

```sql
-- テーブル一覧
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 期待される結果:
-- athletes
-- attempts
-- competitions
-- profiles
-- usage_logs

-- RLSポリシー確認
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- トリガー確認
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

全て表示されればOKです！
