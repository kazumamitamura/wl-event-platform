-- ============================================
-- Cleanup Script
-- 既存のテーブルを削除してクリーンな状態にします
-- ============================================

-- 警告: このスクリプトは全てのデータを削除します！
-- 本番環境では絶対に実行しないでください！

-- Drop tables in reverse order (foreign key constraints)
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop triggers (CASCADE で自動削除されますが、念のため)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP TRIGGER IF EXISTS update_competitions_updated_at ON competitions;
-- DROP TRIGGER IF EXISTS update_athletes_updated_at ON athletes;
-- DROP TRIGGER IF EXISTS update_attempts_updated_at ON attempts;

-- 完了
SELECT 'Cleanup completed. You can now run schema.sql' as message;
