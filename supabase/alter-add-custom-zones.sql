-- ============================================
-- 既存の wl_athletes テーブルに個別 Zone 設定を追加
-- ※ 既にカラムがあっても安全に実行可能
-- ============================================
ALTER TABLE wl_athletes ADD COLUMN IF NOT EXISTS custom_zone_3 INTEGER;
ALTER TABLE wl_athletes ADD COLUMN IF NOT EXISTS custom_zone_2 INTEGER;
ALTER TABLE wl_athletes ADD COLUMN IF NOT EXISTS custom_zone_1 INTEGER;

COMMENT ON COLUMN wl_athletes.custom_zone_3 IS '個別設定: 3本待ちの重量差 (NULL=大会設定を使用)';
COMMENT ON COLUMN wl_athletes.custom_zone_2 IS '個別設定: 2本待ちの重量差';
COMMENT ON COLUMN wl_athletes.custom_zone_1 IS '個別設定: 1本待ちの重量差';

SELECT 'custom_zone columns added.' as message;
