-- ============================================
-- Cleanup Script v2
-- 全データを削除してクリーンな状態にします
-- ⚠️ 本番環境では絶対に実行しないでください ⚠️
-- ============================================

-- Realtime パブリケーションから削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE attempts;
  END IF;
END
$$;

-- 旧ポリシー名を削除 (v1 時代のもの)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own logs" ON usage_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON usage_logs;
DROP POLICY IF EXISTS "Users can update their own logs" ON usage_logs;
DROP POLICY IF EXISTS "Everyone can view competitions" ON competitions;
DROP POLICY IF EXISTS "Only admins can manage competitions" ON competitions;
DROP POLICY IF EXISTS "Everyone can view athletes" ON athletes;
DROP POLICY IF EXISTS "Only admins can manage athletes" ON athletes;
DROP POLICY IF EXISTS "Everyone can view attempts" ON attempts;
DROP POLICY IF EXISTS "Only admins can manage attempts" ON attempts;

-- テーブル削除 (FK 依存順)
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 関数削除
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

SELECT 'Cleanup completed. Run schema-safe.sql next.' as message;
