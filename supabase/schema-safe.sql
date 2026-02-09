-- ============================================
-- ウエイトリフティング競技運営プラットフォーム
-- Database Schema (Safe Version - IF NOT EXISTS)
-- v2: RLS 修正 + Realtime 有効化
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. profiles
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('高校生', '大学生', '社会人選手', '監督・コーチ', '運営')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- handle_new_user (SECURITY DEFINER) が INSERT するので
-- INSERT ポリシーは不要（RLS バイパス）

-- ============================================
-- 2. usage_logs
-- ============================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_logs_select_own" ON usage_logs;
CREATE POLICY "usage_logs_select_own"
  ON usage_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_logs_insert_own" ON usage_logs;
CREATE POLICY "usage_logs_insert_own"
  ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_logs_update_own" ON usage_logs;
CREATE POLICY "usage_logs_update_own"
  ON usage_logs FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 3. competitions
-- ============================================
CREATE TABLE IF NOT EXISTS competitions (
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

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
DROP POLICY IF EXISTS "competitions_select_all" ON competitions;
CREATE POLICY "competitions_select_all"
  ON competitions FOR SELECT USING (true);

-- 運営のみ INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "competitions_insert_admin" ON competitions;
CREATE POLICY "competitions_insert_admin"
  ON competitions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "competitions_update_admin" ON competitions;
CREATE POLICY "competitions_update_admin"
  ON competitions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "competitions_delete_admin" ON competitions;
CREATE POLICY "competitions_delete_admin"
  ON competitions FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

-- ============================================
-- 4. athletes
-- ============================================
CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body_weight DECIMAL(5,2) NOT NULL,
  lot_number INTEGER NOT NULL,
  snatch_1st_weight INTEGER NOT NULL,
  jerk_1st_weight INTEGER NOT NULL,
  group_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, lot_number)
);

ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athletes_select_all" ON athletes;
CREATE POLICY "athletes_select_all"
  ON athletes FOR SELECT USING (true);

DROP POLICY IF EXISTS "athletes_insert_admin" ON athletes;
CREATE POLICY "athletes_insert_admin"
  ON athletes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "athletes_update_admin" ON athletes;
CREATE POLICY "athletes_update_admin"
  ON athletes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "athletes_delete_admin" ON athletes;
CREATE POLICY "athletes_delete_admin"
  ON athletes FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

-- ============================================
-- 5. attempts
-- ============================================
CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  lift_type TEXT NOT NULL CHECK (lift_type IN ('Snatch', 'Jerk')),
  attempt_number INTEGER NOT NULL CHECK (attempt_number IN (1, 2, 3)),
  declared_weight INTEGER NOT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'success', 'fail', 'skip')),
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(athlete_id, lift_type, attempt_number)
);

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attempts_select_all" ON attempts;
CREATE POLICY "attempts_select_all"
  ON attempts FOR SELECT USING (true);

DROP POLICY IF EXISTS "attempts_insert_admin" ON attempts;
CREATE POLICY "attempts_insert_admin"
  ON attempts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "attempts_update_admin" ON attempts;
CREATE POLICY "attempts_update_admin"
  ON attempts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

DROP POLICY IF EXISTS "attempts_delete_admin" ON attempts;
CREATE POLICY "attempts_delete_admin"
  ON attempts FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND category = '運営')
  );

-- ============================================
-- Triggers: updated_at 自動更新
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_competitions_updated_at ON competitions;
CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON competitions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_athletes_updated_at ON athletes;
CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON athletes FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attempts_updated_at ON attempts;
CREATE TRIGGER update_attempts_updated_at
  BEFORE UPDATE ON attempts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Trigger: Auth ユーザー作成時にプロフィール自動生成
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, category)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'category', '社会人選手')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_athletes_competition ON athletes(competition_id);
CREATE INDEX IF NOT EXISTS idx_attempts_athlete ON attempts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_attempts_is_current ON attempts(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);

-- ============================================
-- Realtime 有効化 (attempts テーブルの変更を配信)
-- ============================================
DO $$
BEGIN
  -- attempts テーブルを Realtime パブリケーションに追加
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attempts;
  END IF;
END
$$;

-- ============================================
SELECT 'Schema v2 setup completed successfully!' as message;
