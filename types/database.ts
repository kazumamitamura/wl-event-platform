// ============================================
// Database Types
// ============================================

export type UserCategory = '高校生' | '大学生' | '社会人選手' | '監督・コーチ' | '運営';

export type CompetitionStatus = 'upcoming' | 'active' | 'finished';

export type LiftType = 'Snatch' | 'Jerk';

export type AttemptResult = 'pending' | 'success' | 'fail' | 'skip';

// ============================================
// Table Types
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  category: UserCategory;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
  device_info: string | null;
  created_at: string;
}

export interface Competition {
  id: string;
  name: string;
  date: string;
  status: CompetitionStatus;
  config_wait_zone_a: number;
  config_wait_zone_b: number;
  config_wait_zone_c: number;
  created_at: string;
  updated_at: string;
}

export interface Athlete {
  id: string;
  competition_id: string;
  name: string;
  body_weight: number;
  lot_number: number;
  snatch_1st_weight: number;
  jerk_1st_weight: number;
  group_name: string;
  created_at: string;
  updated_at: string;
}

export interface Attempt {
  id: string;
  athlete_id: string;
  lift_type: LiftType;
  attempt_number: 1 | 2 | 3;
  declared_weight: number;
  result: AttemptResult;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Extended Types (with relations)
// ============================================

export interface AthleteWithAttempts extends Athlete {
  attempts: Attempt[];
}

export interface CompetitionWithAthletes extends Competition {
  athletes: AthleteWithAttempts[];
}

// ============================================
// View Models for UI
// ============================================

export interface AttemptQueueItem {
  attempt_id: string;
  athlete_id: string;
  athlete_name: string;
  lot_number: number;
  lift_type: LiftType;
  attempt_number: 1 | 2 | 3;
  declared_weight: number;
  result: AttemptResult;
  is_current: boolean;
  priority_score: number; // For sorting
}

export interface WaitCounterInfo {
  athlete_name: string;
  current_weight: number;
  wait_count: number; // あと何本待ちか
  next_athletes: {
    name: string;
    weight: number;
    predicted_attempts: number;
  }[];
}
