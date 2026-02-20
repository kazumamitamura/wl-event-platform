-- ============================================
-- WL Event Platform — Schema (wl_ prefix)
-- 他アプリと同じ Supabase DB で共存するため
-- 全テーブルに wl_ プレフィックスを使用
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. wl_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS wl_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('高校生', '大学生', '社会人選手', '監督・コーチ', '運営')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE wl_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_profiles_select_own" ON wl_profiles;
CREATE POLICY "wl_profiles_select_own"
  ON wl_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "wl_profiles_update_own" ON wl_profiles;
CREATE POLICY "wl_profiles_update_own"
  ON wl_profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 2. wl_usage_logs
-- ============================================
CREATE TABLE IF NOT EXISTS wl_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wl_profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE wl_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_usage_logs_select_own" ON wl_usage_logs;
CREATE POLICY "wl_usage_logs_select_own"
  ON wl_usage_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wl_usage_logs_insert_own" ON wl_usage_logs;
CREATE POLICY "wl_usage_logs_insert_own"
  ON wl_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wl_usage_logs_update_own" ON wl_usage_logs;
CREATE POLICY "wl_usage_logs_update_own"
  ON wl_usage_logs FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 3. wl_competitions
-- ============================================
CREATE TABLE IF NOT EXISTS wl_competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished')),
  config_wait_zone_a INTEGER DEFAULT 8,
  config_wait_zone_b INTEGER DEFAULT 4,
  config_wait_zone_c INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE wl_competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_competitions_select_all" ON wl_competitions;
CREATE POLICY "wl_competitions_select_all"
  ON wl_competitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "wl_competitions_insert_admin" ON wl_competitions;
CREATE POLICY "wl_competitions_insert_admin"
  ON wl_competitions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "wl_competitions_update_admin" ON wl_competitions;
CREATE POLICY "wl_competitions_update_admin"
  ON wl_competitions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "wl_competitions_delete_admin" ON wl_competitions;
CREATE POLICY "wl_competitions_delete_admin"
  ON wl_competitions FOR DELETE USING (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

-- ============================================
-- 4. wl_athletes
-- ============================================
CREATE TABLE IF NOT EXISTS wl_athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES wl_competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body_weight DECIMAL(5,2) NOT NULL,
  lot_number INTEGER NOT NULL,
  snatch_1st_weight INTEGER NOT NULL,
  jerk_1st_weight INTEGER NOT NULL,
  group_name TEXT NOT NULL,
  custom_zone_3 INTEGER,  -- 個別設定: 3本待ちの重量差 (NULL = 大会設定を使用)
  custom_zone_2 INTEGER,  -- 個別設定: 2本待ちの重量差
  custom_zone_1 INTEGER,  -- 個別設定: 1本待ちの重量差
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, lot_number)
);

ALTER TABLE wl_athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_athletes_select_all" ON wl_athletes;
CREATE POLICY "wl_athletes_select_all"
  ON wl_athletes FOR SELECT USING (true);

DROP POLICY IF EXISTS "wl_athletes_insert_admin" ON wl_athletes;
CREATE POLICY "wl_athletes_insert_admin"
  ON wl_athletes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "wl_athletes_update_admin" ON wl_athletes;
CREATE POLICY "wl_athletes_update_admin"
  ON wl_athletes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "wl_athletes_delete_admin" ON wl_athletes;
CREATE POLICY "wl_athletes_delete_admin"
  ON wl_athletes FOR DELETE USING (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

-- ============================================
-- 5. wl_attempts
-- ============================================
CREATE TABLE IF NOT EXISTS wl_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES wl_athletes(id) ON DELETE CASCADE,
  lift_type TEXT NOT NULL CHECK (lift_type IN ('Snatch', 'Jerk')),
  attempt_number INTEGER NOT NULL CHECK (attempt_number IN (1, 2, 3)),
  declared_weight INTEGER NOT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'success', 'fail', 'skip')),
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(athlete_id, lift_type, attempt_number)
);

ALTER TABLE wl_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_attempts_select_all" ON wl_attempts;
CREATE POLICY "wl_attempts_select_all"
  ON wl_attempts FOR SELECT USING (true);

DROP POLICY IF EXISTS "wl_attempts_insert_admin" ON wl_attempts;
CREATE POLICY "wl_attempts_insert_admin"
  ON wl_attempts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "wl_attempts_update_admin" ON wl_attempts;
CREATE POLICY "wl_attempts_update_admin"
  ON wl_attempts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "wl_attempts_delete_admin" ON wl_attempts;
CREATE POLICY "wl_attempts_delete_admin"
  ON wl_attempts FOR DELETE USING (
    EXISTS (SELECT 1 FROM wl_profiles WHERE id = auth.uid() AND category = '運営')
  );

-- ============================================
-- Triggers: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wl_update_competitions ON wl_competitions;
CREATE TRIGGER wl_update_competitions
  BEFORE UPDATE ON wl_competitions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS wl_update_athletes ON wl_athletes;
CREATE TRIGGER wl_update_athletes
  BEFORE UPDATE ON wl_athletes FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS wl_update_attempts ON wl_attempts;
CREATE TRIGGER wl_update_attempts
  BEFORE UPDATE ON wl_attempts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Trigger: Auth → wl_profiles 自動作成
-- ★ 関数名・トリガー名を wl_ 固有にして他アプリと衝突しない
-- ============================================
CREATE OR REPLACE FUNCTION public.wl_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wl_profiles (id, email, full_name, category)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'category', '社会人選手')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS wl_on_auth_user_created ON auth.users;
CREATE TRIGGER wl_on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.wl_handle_new_user();

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wl_athletes_comp ON wl_athletes(competition_id);
CREATE INDEX IF NOT EXISTS idx_wl_attempts_ath ON wl_attempts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_wl_attempts_cur ON wl_attempts(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_wl_usage_logs_usr ON wl_usage_logs(user_id);

-- ============================================
-- Realtime
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wl_attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wl_attempts;
  END IF;
END
$$;

SELECT 'WL schema setup completed! (wl_ prefix)' as message;
