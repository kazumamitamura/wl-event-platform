import type { Competition, Athlete, Attempt, AttemptQueueItem, WaitCounterInfo } from '@/types';

/**
 * 待機本数を計算する
 * @param targetAthleteId 対象選手のID
 * @param athletes 全選手データ
 * @param attempts 全試技データ
 * @param competition 大会情報（zone設定を含む）
 * @returns 待機本数情報
 */
export function calculateWaitCount(
  targetAthleteId: string,
  athletes: Athlete[],
  attempts: Attempt[],
  competition: Competition
): WaitCounterInfo | null {
  // 対象選手を取得
  const targetAthlete = athletes.find(a => a.id === targetAthleteId);
  if (!targetAthlete) return null;

  // 対象選手の次の試技を取得
  const targetAttempts = attempts.filter(a => a.athlete_id === targetAthleteId);
  const targetNextAttempt = getNextAttempt(targetAttempts);
  
  if (!targetNextAttempt) {
    return {
      athlete_name: targetAthlete.name,
      current_weight: 0,
      wait_count: 0,
      next_athletes: [],
    };
  }

  const targetWeight = targetNextAttempt.declared_weight;

  // 試技順キューを作成
  const queue = buildAttemptQueue(athletes, attempts);

  // 対象選手より前に試技を行う選手を抽出
  const targetIndex = queue.findIndex(
    q => q.athlete_id === targetAthleteId && q.attempt_id === targetNextAttempt.id
  );

  if (targetIndex === -1) {
    return {
      athlete_name: targetAthlete.name,
      current_weight: targetWeight,
      wait_count: 0,
      next_athletes: [],
    };
  }

  const athletesBeforeTarget = queue.slice(0, targetIndex);

  // 各選手について予測試技数を計算
  let totalWaitCount = 0;
  const nextAthletesInfo: { name: string; weight: number; predicted_attempts: number }[] = [];

  for (const queueItem of athletesBeforeTarget) {
    const athlete = athletes.find(a => a.id === queueItem.athlete_id);
    if (!athlete) continue;

    const athleteAttempts = attempts.filter(a => a.athlete_id === queueItem.athlete_id);
    const remainingAttempts = getRemainingAttempts(athleteAttempts, queueItem.lift_type);

    // 重量差に基づく予測試技数を計算
    const weightDiff = targetWeight - queueItem.declared_weight;
    let predictedAttempts = 0;

    if (weightDiff >= competition.config_wait_zone_a) {
      predictedAttempts = 3;
    } else if (weightDiff >= competition.config_wait_zone_b) {
      predictedAttempts = 2;
    } else if (weightDiff >= competition.config_wait_zone_c) {
      predictedAttempts = 1;
    }

    // 実際の残り試技数を超えないように制限
    predictedAttempts = Math.min(predictedAttempts, remainingAttempts);

    totalWaitCount += predictedAttempts;

    // 重複しない選手のみ情報を追加
    if (!nextAthletesInfo.some(info => info.name === athlete.name)) {
      nextAthletesInfo.push({
        name: athlete.name,
        weight: queueItem.declared_weight,
        predicted_attempts: predictedAttempts,
      });
    }
  }

  return {
    athlete_name: targetAthlete.name,
    current_weight: targetWeight,
    wait_count: totalWaitCount,
    next_athletes: nextAthletesInfo,
  };
}

/**
 * 試技順キューを構築（バーベル・ローデッド法）
 * 優先順位: 1. 重量（軽い順）, 2. 試技回数（少ない順）, 3. 抽選番号（小さい順）
 */
export function buildAttemptQueue(
  athletes: Athlete[],
  attempts: Attempt[]
): AttemptQueueItem[] {
  const queue: AttemptQueueItem[] = [];

  for (const athlete of athletes) {
    const athleteAttempts = attempts.filter(a => a.athlete_id === athlete.id);

    for (const attempt of athleteAttempts) {
      if (attempt.result === 'pending') {
        queue.push({
          attempt_id: attempt.id,
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          lot_number: athlete.lot_number,
          lift_type: attempt.lift_type,
          attempt_number: attempt.attempt_number,
          declared_weight: attempt.declared_weight,
          result: attempt.result,
          is_current: attempt.is_current,
          priority_score: 0, // Will be calculated
        });
      }
    }
  }

  // ソート: 重量 -> 試技回数 -> 抽選番号
  queue.sort((a, b) => {
    if (a.declared_weight !== b.declared_weight) {
      return a.declared_weight - b.declared_weight;
    }
    if (a.attempt_number !== b.attempt_number) {
      return a.attempt_number - b.attempt_number;
    }
    return a.lot_number - b.lot_number;
  });

  return queue;
}

/**
 * 選手の次の試技を取得
 */
function getNextAttempt(attempts: Attempt[]): Attempt | null {
  const pending = attempts.filter(a => a.result === 'pending');
  if (pending.length === 0) return null;

  // Snatch -> Jerk の順
  const snatch = pending.find(a => a.lift_type === 'Snatch');
  if (snatch) return snatch;

  const jerk = pending.find(a => a.lift_type === 'Jerk');
  return jerk || null;
}

/**
 * 指定種目の残り試技数を取得
 */
function getRemainingAttempts(attempts: Attempt[], liftType: 'Snatch' | 'Jerk'): number {
  const liftAttempts = attempts.filter(a => a.lift_type === liftType);
  const completedCount = liftAttempts.filter(a => a.result !== 'pending').length;
  return 3 - completedCount;
}

/**
 * 次の試技重量の検証
 * 成功なら+1kg以上、失敗なら同重量以上
 */
export function validateNextWeight(
  currentWeight: number,
  nextWeight: number,
  wasSuccess: boolean
): boolean {
  if (wasSuccess) {
    return nextWeight >= currentWeight + 1;
  } else {
    return nextWeight >= currentWeight;
  }
}
