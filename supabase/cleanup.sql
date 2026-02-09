-- ============================================
-- WL Event Platform — Cleanup (wl_ prefix)
-- ⚠️ 本番データを全削除します ⚠️
-- ※ 他アプリのテーブル(profiles等)には一切触れません
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wl_attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE wl_attempts;
  END IF;
END
$$;

DROP TABLE IF EXISTS wl_attempts CASCADE;
DROP TABLE IF EXISTS wl_athletes CASCADE;
DROP TABLE IF EXISTS wl_competitions CASCADE;
DROP TABLE IF EXISTS wl_usage_logs CASCADE;
DROP TABLE IF EXISTS wl_profiles CASCADE;

DROP FUNCTION IF EXISTS public.wl_handle_new_user() CASCADE;

SELECT 'WL cleanup completed. Run schema-safe.sql next.' as message;
