-- ============================================
-- WL Event Platform — 待機本数検証用シードデータ
--
-- 大会設定: ZoneA=8, ZoneB=4, ZoneC=0
-- ターゲット: 選手K (110kg)
--
-- 期待される計算結果:
--   A (100kg, 残3): diff=10 ≥ 8 → MIN(3,3) = 3
--   B (101kg, 残3): diff= 9 ≥ 8 → MIN(3,3) = 3
--   C (102kg, 残3): diff= 8 ≥ 8 → MIN(3,3) = 3
--   D (103kg, 残2): diff= 7 ≥ 4 → MIN(2,2) = 2
--   E (104kg, 残2): diff= 6 ≥ 4 → MIN(2,2) = 2
--   F (105kg, 残2): diff= 5 ≥ 4 → MIN(2,2) = 2
--   G (106kg, 残2): diff= 4 ≥ 4 → MIN(2,2) = 2
--   H (107kg, 残1): diff= 3 ≥ 0 → MIN(1,1) = 1
--   I (108kg, 残1): diff= 2 ≥ 0 → MIN(1,1) = 1
--   J (109kg, 残1): diff= 1 ≥ 0 → MIN(1,1) = 1
--   L (111kg):       diff=-1 < 0 → 対象外
--   M (112kg):       diff=-2 < 0 → 対象外
--
--   合計: 9 + 8 + 3 = ★ 20本待ち ★
-- ============================================

-- 既存テストデータを安全に削除
DELETE FROM wl_attempts WHERE athlete_id IN (
  SELECT id FROM wl_athletes WHERE competition_id IN (
    '00000000-0000-0000-0000-000000000100',
    '11111111-1111-1111-1111-111111111111'
  )
);
DELETE FROM wl_athletes WHERE competition_id IN (
  '00000000-0000-0000-0000-000000000100',
  '11111111-1111-1111-1111-111111111111'
);
DELETE FROM wl_competitions WHERE id IN (
  '00000000-0000-0000-0000-000000000100',
  '11111111-1111-1111-1111-111111111111'
);

-- ============================================
-- 大会
-- ============================================
INSERT INTO wl_competitions (id, name, date, status, config_wait_zone_a, config_wait_zone_b, config_wait_zone_c)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '待機本数検証大会',
  '2026-03-01',
  'active',
  8, 4, 0
);

-- ============================================
-- 選手 (A〜M, 13名)
-- ============================================
INSERT INTO wl_athletes (id, competition_id, name, body_weight, lot_number, snatch_1st_weight, jerk_1st_weight, group_name)
VALUES
  -- Zone A グループ (残3本: 1回目が pending → remaining = 3-1+1 = 3)
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000100', '選手A', 67.0,  1, 100, 130, 'A'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000100', '選手B', 68.0,  2, 101, 131, 'A'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000100', '選手C', 69.0,  3, 102, 132, 'A'),
  -- Zone B グループ (残2本: 1回目 success → 2回目が pending → remaining = 3-2+1 = 2)
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000100', '選手D', 70.0,  4, 100, 133, 'A'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000100', '選手E', 71.0,  5, 101, 134, 'A'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000100', '選手F', 72.0,  6, 102, 135, 'A'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000100', '選手G', 73.0,  7, 103, 136, 'A'),
  -- Zone C グループ (残1本: 1,2回目 success → 3回目が pending → remaining = 3-3+1 = 1)
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000100', '選手H', 74.0,  8, 100, 137, 'A'),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000100', '選手I', 75.0,  9, 101, 138, 'A'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100', '選手J', 76.0, 10, 102, 139, 'A'),
  -- ターゲット選手K (110kg, 全3回 pending)
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000100', '選手K', 77.0, 11, 110, 140, 'A'),
  -- 計算対象外 (Kより重い)
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000100', '選手L', 78.0, 12, 111, 141, 'A'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000100', '選手M', 79.0, 13, 112, 142, 'A');

-- ============================================
-- Snatch 試技データ
-- ============================================

-- ── 選手A (全3回 pending, 現在100kg) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Snatch', 1, 100, 'pending'),
  ('00000000-0000-0000-0000-000000000001', 'Snatch', 2, 103, 'pending'),
  ('00000000-0000-0000-0000-000000000001', 'Snatch', 3, 106, 'pending');

-- ── 選手B (全3回 pending, 現在101kg) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Snatch', 1, 101, 'pending'),
  ('00000000-0000-0000-0000-000000000002', 'Snatch', 2, 104, 'pending'),
  ('00000000-0000-0000-0000-000000000002', 'Snatch', 3, 107, 'pending');

-- ── 選手C (全3回 pending, 現在102kg) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000003', 'Snatch', 1, 102, 'pending'),
  ('00000000-0000-0000-0000-000000000003', 'Snatch', 2, 105, 'pending'),
  ('00000000-0000-0000-0000-000000000003', 'Snatch', 3, 108, 'pending');

-- ── 選手D (1回目 success → 現在103kg, 残2本) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000004', 'Snatch', 1, 100, 'success'),
  ('00000000-0000-0000-0000-000000000004', 'Snatch', 2, 103, 'pending'),
  ('00000000-0000-0000-0000-000000000004', 'Snatch', 3, 106, 'pending');

-- ── 選手E (1回目 success → 現在104kg, 残2本) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000005', 'Snatch', 1, 101, 'success'),
  ('00000000-0000-0000-0000-000000000005', 'Snatch', 2, 104, 'pending'),
  ('00000000-0000-0000-0000-000000000005', 'Snatch', 3, 107, 'pending');

-- ── 選手F (1回目 success → 現在105kg, 残2本) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000006', 'Snatch', 1, 102, 'success'),
  ('00000000-0000-0000-0000-000000000006', 'Snatch', 2, 105, 'pending'),
  ('00000000-0000-0000-0000-000000000006', 'Snatch', 3, 108, 'pending');

-- ── 選手G (1回目 success → 現在106kg, 残2本) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000007', 'Snatch', 1, 103, 'success'),
  ('00000000-0000-0000-0000-000000000007', 'Snatch', 2, 106, 'pending'),
  ('00000000-0000-0000-0000-000000000007', 'Snatch', 3, 109, 'pending');

-- ── 選手H (1,2回目 success → 現在107kg, 残1本) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000008', 'Snatch', 1, 100, 'success'),
  ('00000000-0000-0000-0000-000000000008', 'Snatch', 2, 104, 'success'),
  ('00000000-0000-0000-0000-000000000008', 'Snatch', 3, 107, 'pending');

-- ── 選手I (1,2回目 success → 現在108kg, 残1本) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000009', 'Snatch', 1, 101, 'success'),
  ('00000000-0000-0000-0000-000000000009', 'Snatch', 2, 105, 'success'),
  ('00000000-0000-0000-0000-000000000009', 'Snatch', 3, 108, 'pending');

-- ── 選手J (1,2回目 success → 現在109kg, 残1本) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Snatch', 1, 102, 'success'),
  ('00000000-0000-0000-0000-000000000010', 'Snatch', 2, 106, 'success'),
  ('00000000-0000-0000-0000-000000000010', 'Snatch', 3, 109, 'pending');

-- ── 選手K ★ターゲット★ (全3回 pending, 現在110kg) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000011', 'Snatch', 1, 110, 'pending'),
  ('00000000-0000-0000-0000-000000000011', 'Snatch', 2, 113, 'pending'),
  ('00000000-0000-0000-0000-000000000011', 'Snatch', 3, 115, 'pending');

-- ── 選手L (全3回 pending, 現在111kg — K より重いので対象外) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000012', 'Snatch', 1, 111, 'pending'),
  ('00000000-0000-0000-0000-000000000012', 'Snatch', 2, 114, 'pending'),
  ('00000000-0000-0000-0000-000000000012', 'Snatch', 3, 116, 'pending');

-- ── 選手M (全3回 pending, 現在112kg — K より重いので対象外) ──
INSERT INTO wl_attempts (athlete_id, lift_type, attempt_number, declared_weight, result) VALUES
  ('00000000-0000-0000-0000-000000000013', 'Snatch', 1, 112, 'pending'),
  ('00000000-0000-0000-0000-000000000013', 'Snatch', 2, 115, 'pending'),
  ('00000000-0000-0000-0000-000000000013', 'Snatch', 3, 117, 'pending');

-- ============================================
-- 最初の試技を「進行中」にする
-- キュー先頭 = 選手A Snatch 1回目 (100kg)
-- ============================================
UPDATE wl_attempts
SET is_current = true
WHERE athlete_id = '00000000-0000-0000-0000-000000000001'
  AND lift_type = 'Snatch'
  AND attempt_number = 1;

-- ============================================
-- 確認クエリ
-- ============================================
SELECT
  a.name AS 選手名,
  at.lift_type AS 種目,
  at.attempt_number AS 回数,
  at.declared_weight AS 重量,
  at.result AS 結果,
  at.is_current AS 進行中
FROM wl_attempts at
JOIN wl_athletes a ON a.id = at.athlete_id
WHERE a.competition_id = '00000000-0000-0000-0000-000000000100'
ORDER BY at.declared_weight, at.attempt_number, a.lot_number;
