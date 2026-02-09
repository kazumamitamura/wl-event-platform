-- ============================================
-- ウエイトリフティング競技運営プラットフォーム
-- Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. profiles (ユーザープロフィール)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('高校生', '大学生', '社会人選手', '監督・コーチ', '運営')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. usage_logs (利用ログ)
-- ============================================
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for usage_logs
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs"
  ON usage_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. competitions (大会情報)
-- ============================================
CREATE TABLE competitions (
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

-- RLS Policies for competitions
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view competitions"
  ON competitions FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage competitions"
  ON competitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.category = '運営'
    )
  );

-- ============================================
-- 4. athletes (選手エントリー)
-- ============================================
CREATE TABLE athletes (
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

-- RLS Policies for athletes
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view athletes"
  ON athletes FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage athletes"
  ON athletes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.category = '運営'
    )
  );

-- ============================================
-- 5. attempts (試技記録)
-- ============================================
CREATE TABLE attempts (
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

-- RLS Policies for attempts
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view attempts"
  ON attempts FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage attempts"
  ON attempts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.category = '運営'
    )
  );

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attempts_updated_at
  BEFORE UPDATE ON attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function: Create profile on signup
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

-- Trigger for profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_athletes_competition ON athletes(competition_id);
CREATE INDEX idx_attempts_athlete ON attempts(athlete_id);
CREATE INDEX idx_attempts_is_current ON attempts(is_current) WHERE is_current = TRUE;
CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);

-- ============================================
-- Initial data (Optional)
-- ============================================
-- サンプル大会データ
-- INSERT INTO competitions (name, date, status)
-- VALUES ('第1回サンプル大会', '2026-03-15', 'upcoming');
