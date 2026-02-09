-- ============================================
-- auth.users → wl_profiles へ直接データ移行
--
-- 旧 profiles テーブルではなく auth.users から読み取るので
-- 他アプリのテーブル構造に依存しません
-- ============================================

-- まず auth.users の中身を確認
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name' AS full_name,
  raw_user_meta_data->>'category' AS category,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- wl_profiles にまだ登録されていないユーザーを一括挿入
INSERT INTO wl_profiles (id, email, full_name, category, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  CASE
    WHEN u.raw_user_meta_data->>'category' IN ('高校生', '大学生', '社会人選手', '監督・コーチ', '運営')
    THEN u.raw_user_meta_data->>'category'
    ELSE '運営'
  END,
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM wl_profiles wp WHERE wp.id = u.id
);

-- 結果確認
SELECT * FROM wl_profiles ORDER BY created_at DESC;
