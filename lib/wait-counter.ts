import type {
  Competition,
  Athlete,
  Attempt,
  LiftType,
  AttemptQueueItem,
  WaitCounterInfo,
} from '@/types';

// ─────────────────────────────────────────────
// ヘルパー: 種目名の日本語表示
// ─────────────────────────────────────────────
export function liftTypeLabel(lt: LiftType): string {
  return lt === 'Snatch' ? 'スナッチ' : 'クリーン&ジャーク';
}

// ─────────────────────────────────────────────
// ヘルパー: 現在のフェーズ(種目)を判定
//   Snatch に pending が1つでもあれば → Snatch フェーズ
//   なければ → Jerk (C&J) フェーズ
// ─────────────────────────────────────────────
export function getCurrentLiftType(attempts: Attempt[]): LiftType {
  const hasPendingSnatch = attempts.some(
    (a) => a.lift_type === 'Snatch' && a.result === 'pending'
  );
  return hasPendingSnatch ? 'Snatch' : 'Jerk';
}

// ─────────────────────────────────────────────
// 1. 試技順ソート — バーベル・ローデッド法
//    ★ 現在フェーズ(Snatch or Jerk)の pending のみ
//    優先順位: 重量(軽い順) → 試技回数(少ない順) → 抽選番号(小さい順)
// ─────────────────────────────────────────────
export function buildAttemptQueue(
  athletes: Athlete[],
  attempts: Attempt[]
): AttemptQueueItem[] {
  const currentPhase = getCurrentLiftType(attempts);
  const queue: AttemptQueueItem[] = [];

  for (const athlete of athletes) {
    const athleteAttempts = attempts.filter(
      (a) =>
        a.athlete_id === athlete.id &&
        a.lift_type === currentPhase
    );

    for (const attempt of athleteAttempts) {
      if (attempt.result === 'pending') {
        queue.push({
          attempt_id: attempt.id,
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          group_name: athlete.group_name,
          lot_number: athlete.lot_number,
          lift_type: attempt.lift_type,
          attempt_number: attempt.attempt_number,
          declared_weight: attempt.declared_weight,
          result: attempt.result,
          is_current: attempt.is_current,
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
//      ★ 現在フェーズのキューのみ対象
//      ★ キュー先頭の選手は 0本 待ち
//      Targetより試技順が早い各Other【選手】についてループ。
//      ① diff = Target.current_weight − Other.current_weight
//      ② diff に基づき基本加算数を決定
//           diff >= zone_A → +3
//           diff >= zone_B → +2
//           diff >= zone_C → +1
//           それ以外     → +0 (カウントしない)
//      ③ Other の残り試技数 = 3 − attempt_number + 1
//           ※ 同フェーズ(種目)内の残り本数
//      ④ MIN(基本加算数, 残り試技数) を合計に加算
// ─────────────────────────────────────────────
export function calculateWaitAttempts(
  targetAthleteId: string,
  athletes: Athlete[],
  attempts: Attempt[],
  competition: Competition
): WaitCounterInfo | null {
  const targetAthlete = athletes.find((a) => a.id === targetAthleteId);
  if (!targetAthlete) return null;

  const currentPhase = getCurrentLiftType(attempts);

  // Target の現在フェーズの「次の pending 試技」を取得
  const targetPhaseAttempts = attempts.filter(
    (a) => a.athlete_id === targetAthleteId && a.lift_type === currentPhase
  );
  const targetNextAttempt = getNextPendingAttemptForPhase(targetPhaseAttempts);

  if (!targetNextAttempt) {
    return {
      athlete_name: targetAthlete.name,
      current_weight: 0,
      wait_count: 0,
      next_athletes: [],
    };
  }

  const targetWeight = targetNextAttempt.declared_weight;

  // 試技順キュー（フェーズ内のみ）
  const queue = buildAttemptQueue(athletes, attempts);

  // Target のキュー内位置を特定
  const targetIndex = queue.findIndex(
    (q) =>
      q.athlete_id === targetAthleteId &&
      q.attempt_id === targetNextAttempt.id
  );

  if (targetIndex <= 0) {
    // ★ 先頭 (index === 0) → 0本待ち
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

    // Other の現在フェーズの「次の pending 試技」を正確に取得
    const otherPhaseAttempts = attempts.filter(
      (a) => a.athlete_id === queueItem.athlete_id && a.lift_type === currentPhase
    );
    const otherNextAttempt = getNextPendingAttemptForPhase(otherPhaseAttempts);
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

    // ③ Other の残り試技数 (同フェーズ内): 3 − attempt_number + 1
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
 * 同一フェーズ(種目)内の「次にやるべき pending 試技」を返す
 * attempt_number 昇順 (1→2→3)
 */
function getNextPendingAttemptForPhase(phaseAttempts: Attempt[]): Attempt | null {
  const pending = phaseAttempts
    .filter((a) => a.result === 'pending')
    .sort((a, b) => a.attempt_number - b.attempt_number);

  return pending[0] ?? null;
}

/**
 * 次の試技重量の検証
 *   成功 → +1kg 以上
 *   失敗 → 同重量以上
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

/**
 * 重量変更の検証（コール前の変更用）
 *   1回目 → 下げることも可能（最低1kg）
 *   2/3回目 → 同重量以上のみ
 */
export function validateWeightChange(
  attemptNumber: 1 | 2 | 3,
  currentWeight: number,
  newWeight: number,
  previousAttemptWeight?: number
): { valid: boolean; minWeight: number } {
  if (newWeight < 1) {
    return { valid: false, minWeight: 1 };
  }

  if (attemptNumber === 1) {
    // 1回目: 自由に変更可（1kg以上であればOK）
    return { valid: newWeight >= 1, minWeight: 1 };
  }

  // 2/3回目: 前回の試技重量以上が必要
  const min = previousAttemptWeight ?? currentWeight;
  return { valid: newWeight >= min, minWeight: min };
}
