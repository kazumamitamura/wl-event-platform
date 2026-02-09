import type {
  Competition,
  Athlete,
  Attempt,
  AttemptQueueItem,
  WaitCounterInfo,
} from '@/types';

// ─────────────────────────────────────────────
// 1. 試技順ソート — バーベル・ローデッド法
//    優先順位: 重量(軽い順) → 試技回数(少ない順) → 抽選番号(小さい順)
//    ※ pending の試技のみをキューに入れる
// ─────────────────────────────────────────────
export function buildAttemptQueue(
  athletes: Athlete[],
  attempts: Attempt[]
): AttemptQueueItem[] {
  const queue: AttemptQueueItem[] = [];

  for (const athlete of athletes) {
    const athleteAttempts = attempts.filter(
      (a) => a.athlete_id === athlete.id
    );

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
          priority_score: 0,
        });
      }
    }
  }

  // バーベル・ローデッド法: 重量 → 試技回数 → 抽選番号 (全て昇順)
  queue.sort((a, b) => {
    if (a.declared_weight !== b.declared_weight)
      return a.declared_weight - b.declared_weight;
    if (a.attempt_number !== b.attempt_number)
      return a.attempt_number - b.attempt_number;
    return a.lot_number - b.lot_number;
  });

  return queue;
}

// ─────────────────────────────────────────────
// 2. 待機本数計算 (calculateWaitAttempts)
//
//    仕様:
//      Targetより試技順が早い各Other【選手】についてループ。
//      ① diff = Target.current_weight − Other.current_weight
//      ② diff に基づき基本加算数を決定
//           diff >= zone_A → +3
//           diff >= zone_B → +2
//           diff >= zone_C → +1
//           それ以外     → +0 (カウントしない)
//      ③ Other の残り試技数 = 3 − attempt_number + 1
//      ④ MIN(基本加算数, 残り試技数) を合計に加算
//
//      ★ 自分より重い選手、同重量で試技順が後の選手はカウントしない
//        → キューで Target より前にいる選手のみ対象
// ─────────────────────────────────────────────
export function calculateWaitAttempts(
  targetAthleteId: string,
  athletes: Athlete[],
  attempts: Attempt[],
  competition: Competition
): WaitCounterInfo | null {
  const targetAthlete = athletes.find((a) => a.id === targetAthleteId);
  if (!targetAthlete) return null;

  // Target の「次の pending 試技」を取得
  const targetAttempts = attempts.filter(
    (a) => a.athlete_id === targetAthleteId
  );
  const targetNextAttempt = getNextPendingAttempt(targetAttempts);

  if (!targetNextAttempt) {
    return {
      athlete_name: targetAthlete.name,
      current_weight: 0,
      wait_count: 0,
      next_athletes: [],
    };
  }

  const targetWeight = targetNextAttempt.declared_weight;

  // 試技順キューを構築
  const queue = buildAttemptQueue(athletes, attempts);

  // Target のキュー内位置を特定
  const targetIndex = queue.findIndex(
    (q) =>
      q.athlete_id === targetAthleteId &&
      q.attempt_id === targetNextAttempt.id
  );

  if (targetIndex <= 0) {
    // 先頭 or 見つからない → 待ちゼロ
    return {
      athlete_name: targetAthlete.name,
      current_weight: targetWeight,
      wait_count: 0,
      next_athletes: [],
    };
  }

  // Target より前にいるキュー項目を取り出す
  const itemsBefore = queue.slice(0, targetIndex);

  // ★ 選手単位で重複排除 — 各選手は 1 回だけ計算する
  const seenAthleteIds = new Set<string>();
  let totalWait = 0;
  const nextAthletesInfo: {
    name: string;
    weight: number;
    predicted_attempts: number;
  }[] = [];

  for (const queueItem of itemsBefore) {
    if (seenAthleteIds.has(queueItem.athlete_id)) continue;
    seenAthleteIds.add(queueItem.athlete_id);

    const otherAthlete = athletes.find(
      (a) => a.id === queueItem.athlete_id
    );
    if (!otherAthlete) continue;

    // Other の「次の pending 試技」を正確に取得
    const otherAttempts = attempts.filter(
      (a) => a.athlete_id === queueItem.athlete_id
    );
    const otherNextAttempt = getNextPendingAttempt(otherAttempts);
    if (!otherNextAttempt) continue;

    const otherWeight = otherNextAttempt.declared_weight;

    // ① 重量差
    const diff = targetWeight - otherWeight;

    // ② 基本加算数
    let baseAddition = 0;
    if (diff >= competition.config_wait_zone_a) {
      baseAddition = 3;
    } else if (diff >= competition.config_wait_zone_b) {
      baseAddition = 2;
    } else if (diff >= competition.config_wait_zone_c) {
      baseAddition = 1;
    } else {
      // diff が zone_c 未満 → カウントしない
      continue;
    }

    // ③ Other の残り試技数: 3 − current_attempt + 1
    const remaining = 3 - otherNextAttempt.attempt_number + 1;

    // ④ MIN(基本加算数, 残り試技数)
    const finalAddition = Math.min(baseAddition, remaining);

    totalWait += finalAddition;

    nextAthletesInfo.push({
      name: otherAthlete.name,
      weight: otherWeight,
      predicted_attempts: finalAddition,
    });
  }

  return {
    athlete_name: targetAthlete.name,
    current_weight: targetWeight,
    wait_count: totalWait,
    next_athletes: nextAthletesInfo,
  };
}

// ─────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────

/**
 * 選手の「次にやるべき pending 試技」を返す
 * Snatch → Jerk の順、同種目なら attempt_number 昇順
 */
function getNextPendingAttempt(attempts: Attempt[]): Attempt | null {
  const pending = attempts
    .filter((a) => a.result === 'pending')
    .sort((a, b) => {
      // Snatch を先に
      if (a.lift_type !== b.lift_type) {
        return a.lift_type === 'Snatch' ? -1 : 1;
      }
      // 回数が少ない方を先に
      return a.attempt_number - b.attempt_number;
    });

  return pending[0] ?? null;
}

/**
 * 次の試技重量の検証
 * 成功 → +1kg 以上、失敗 → 同重量以上
 */
export function validateNextWeight(
  currentWeight: number,
  nextWeight: number,
  wasSuccess: boolean
): boolean {
  if (wasSuccess) {
    return nextWeight >= currentWeight + 1;
  }
  return nextWeight >= currentWeight;
}
