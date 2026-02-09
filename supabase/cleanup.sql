-- ============================================
-- Cleanup Script v3
-- 全データを削除してクリーンな状態にします
-- ⚠️ 本番環境では絶対に実行しないでください ⚠️
--
-- DROP TABLE ... CASCADE で
-- ポリシー / トリガー / インデックスは自動的に削除されるため
-- 個別 DROP POLICY は不要です。
-- ============================================

-- Realtime パブリケーションから削除 (テーブルが無くても安全)
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

-- テーブル削除 (CASCADE で依存オブジェクトも全て削除)
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 関数削除
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

SELECT 'Cleanup completed. Run schema-safe.sql next.' as message;
