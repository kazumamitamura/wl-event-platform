'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/auth';
import { useCompetitionStore } from '@/lib/store/competition-store';
import { buildAttemptQueue, validateNextWeight } from '@/lib/wait-counter';
import type { Competition, AttemptQueueItem } from '@/types';

// ═══════════════════════════════════════════
// Weight Modal Component
// ═══════════════════════════════════════════
function WeightModal({
  isOpen,
  title,
  athleteName,
  liftType,
  attemptNumber,
  defaultWeight,
  minWeight,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  athleteName: string;
  liftType: string;
  attemptNumber: number;
  defaultWeight: number;
  minWeight: number;
  onConfirm: (weight: number) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(defaultWeight);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeight(defaultWeight);
    setError('');
    if (isOpen) {
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [isOpen, defaultWeight]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (weight < minWeight) {
      setError(`${minWeight}kg 以上を入力してください`);
      return;
    }
    onConfirm(weight);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center">
          <div
            className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-3 ${
              title.includes('成功')
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {title}
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {athleteName}
          </div>
          <div className="text-sm text-gray-500">
            {liftType} {attemptNumber}回目
          </div>
        </div>

        {/* Weight input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            次の申告重量 (kg)
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWeight((w) => Math.max(minWeight, w - 1))}
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-2xl font-bold text-gray-700 transition-colors"
            >
              −
            </button>
            <input
              ref={inputRef}
              type="number"
              value={weight}
              onChange={(e) => {
                setWeight(parseInt(e.target.value, 10) || 0);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 text-center text-3xl font-bold py-3 border-2 border-gray-300 rounded-xl text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
            <button
              type="button"
              onClick={() => setWeight((w) => w + 1)}
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-2xl font-bold text-gray-700 transition-colors"
            >
              +
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Admin Dashboard
// ═══════════════════════════════════════════
export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');

  // モーダル制御
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalAttemptId, setModalAttemptId] = useState('');
  const [modalResult, setModalResult] = useState<'success' | 'fail'>('success');
  const [modalAthleteName, setModalAthleteName] = useState('');
  const [modalLiftType, setModalLiftType] = useState('');
  const [modalAttemptNumber, setModalAttemptNumber] = useState(1);
  const [modalDefaultWeight, setModalDefaultWeight] = useState(0);
  const [modalMinWeight, setModalMinWeight] = useState(0);

  // リスト更新アニメ用カウンタ
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    currentCompetition,
    athletes,
    attempts,
    setCompetition,
    setAthletes,
    setAttempts,
  } = useCompetitionStore();

  // ── Auth ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const profile = await getCurrentProfile();
        if (!profile || profile.category !== '運営') {
          router.push('/auth/signin');
          return;
        }
        setIsAdmin(true);
      } catch {
        router.push('/auth/signin');
      } finally {
        setLoading(false);
      }
    })();
    loadCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data ────────────────────────────
  const loadCompetitions = async () => {
    const { data } = await supabase
      .from('competitions')
      .select('*')
      .order('date', { ascending: false });
    if (data) setCompetitions(data);
  };

  const loadCompetitionData = useCallback(
    async (compId: string) => {
      const { data: comp } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', compId)
        .single();
      if (comp) setCompetition(comp);

      const { data: aths } = await supabase
        .from('athletes')
        .select('*')
        .eq('competition_id', compId)
        .order('lot_number');
      if (aths) setAthletes(aths);

      const { data: atts } = await supabase
        .from('attempts')
        .select('*')
        .in('athlete_id', aths?.map((a) => a.id) ?? []);
      if (atts) setAttempts(atts);

      setRefreshKey((k) => k + 1);
    },
    [setCompetition, setAthletes, setAttempts]
  );

  // ── Realtime ────────────────────────
  useEffect(() => {
    if (!selectedCompId) return;
    loadCompetitionData(selectedCompId);

    const ch = supabase
      .channel(`admin-${selectedCompId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, () =>
        loadCompetitionData(selectedCompId)
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [selectedCompId, loadCompetitionData]);

  // ── Actions ─────────────────────────

  const setCurrentAttempt = async (attemptId: string) => {
    const ids = attempts.map((a) => a.id);
    await supabase.from('attempts').update({ is_current: false }).in('id', ids);
    await supabase.from('attempts').update({ is_current: true }).eq('id', attemptId);
  };

  const advanceToNext = async () => {
    const q = buildAttemptQueue(athletes, attempts);
    if (q.length > 0) await setCurrentAttempt(q[0].attempt_id);
  };

  /** 成功 / 失敗 → モーダルを開く */
  const openResultModal = (item: AttemptQueueItem, result: 'success' | 'fail') => {
    const curWeight = item.declared_weight;
    const isSuccess = result === 'success';

    // この選手の同種目・次回試技が pending かを調べ、あれば重量変更先にする
    const nextAttempt = attempts.find(
      (a) =>
        a.athlete_id === item.athlete_id &&
        a.lift_type === item.lift_type &&
        a.attempt_number === ((item.attempt_number + 1) as 1 | 2 | 3) &&
        a.result === 'pending'
    );

    setModalResult(result);
    setModalAttemptId(item.attempt_id);
    setModalTitle(isSuccess ? '成功 (Good Lift)' : '失敗 (No Lift)');
    setModalAthleteName(item.athlete_name);
    setModalLiftType(item.lift_type);
    setModalAttemptNumber(item.attempt_number);
    setModalDefaultWeight(isSuccess ? curWeight + 1 : curWeight);
    setModalMinWeight(isSuccess ? curWeight + 1 : curWeight);
    setModalOpen(true);
  };

  /** モーダル「確定」→ 結果を保存 + 次試技の重量を更新 → 次に進む */
  const handleModalConfirm = async (newWeight: number) => {
    setModalOpen(false);

    // 1. 結果を保存 & is_current を外す
    await supabase
      .from('attempts')
      .update({ result: modalResult, is_current: false })
      .eq('id', modalAttemptId);

    // 2. 次の試技の重量を更新
    const currentItem = attempts.find((a) => a.id === modalAttemptId);
    if (currentItem) {
      const nextAttempt = attempts.find(
        (a) =>
          a.athlete_id === currentItem.athlete_id &&
          a.lift_type === currentItem.lift_type &&
          a.attempt_number === currentItem.attempt_number + 1 &&
          a.result === 'pending'
      );
      if (nextAttempt) {
        await supabase
          .from('attempts')
          .update({ declared_weight: newWeight })
          .eq('id', nextAttempt.id);
      }
    }

    // 3. データ再読込 → 次のキュー先頭を進行中にする
    await loadCompetitionData(selectedCompId);

    // 少し待ってから advanceToNext（データ反映を待つ）
    setTimeout(async () => {
      const freshAttempts = (
        await supabase
          .from('attempts')
          .select('*')
          .in('athlete_id', athletes.map((a) => a.id))
      ).data;
      if (freshAttempts) {
        setAttempts(freshAttempts);
        const q = buildAttemptQueue(athletes, freshAttempts);
        if (q.length > 0 && !q.some((x) => x.is_current)) {
          await setCurrentAttempt(q[0].attempt_id);
        }
      }
    }, 300);
  };

  // ── Queue ───────────────────────────
  const queue =
    currentCompetition && athletes.length > 0
      ? buildAttemptQueue(athletes, attempts)
      : [];

  const topItem = queue.length > 0 ? queue[0] : null;

  // ── Render ──────────────────────────

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-900">読み込み中...</div>
      </div>
    );

  if (!isAdmin) return null;

  return (
    <>
      {/* ── Modal ────────────────────── */}
      <WeightModal
        isOpen={modalOpen}
        title={modalTitle}
        athleteName={modalAthleteName}
        liftType={modalLiftType}
        attemptNumber={modalAttemptNumber}
        defaultWeight={modalDefaultWeight}
        minWeight={modalMinWeight}
        onConfirm={handleModalConfirm}
        onCancel={() => setModalOpen(false)}
      />

      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* ── Header ───────────────── */}
          <div className="bg-white p-5 rounded-xl shadow-sm flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              運営管理画面
            </h1>
            <Link href="/" className="text-gray-500 hover:text-gray-900 text-sm">
              ← ホーム
            </Link>
          </div>

          {/* ── 大会選択 ──────────────── */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              大会を選択
            </label>
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- 大会を選択してください --</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.date}) — {c.status}
                </option>
              ))}
            </select>
          </div>

          {/* ── 現在の試技者カード（1番上をハイライト）──── */}
          {topItem && (
            <div className="relative bg-gradient-to-r from-yellow-50 to-orange-50 border-4 border-red-500 rounded-2xl shadow-lg p-6 md:p-8 animate-highlight-pulse">
              {/* Badge */}
              <span className="absolute -top-3 left-5 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow">
                NOW — 試技中
              </span>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
                {/* 選手情報 */}
                <div>
                  <div className="text-3xl md:text-4xl font-extrabold text-gray-900">
                    {topItem.athlete_name}
                  </div>
                  <div className="text-base md:text-lg text-gray-600 mt-1">
                    {topItem.group_name} ／ Lot#{topItem.lot_number} ／{' '}
                    {topItem.lift_type} {topItem.attempt_number}回目
                  </div>
                </div>

                {/* 重量 */}
                <div className="text-5xl md:text-6xl font-black text-indigo-700 tabular-nums">
                  {topItem.declared_weight}
                  <span className="text-2xl ml-1">kg</span>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => openResultModal(topItem, 'success')}
                  className="flex-1 py-4 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 text-white text-xl font-bold shadow-lg transition-all"
                >
                  ○ 成功 (Good Lift)
                </button>
                <button
                  onClick={() => openResultModal(topItem, 'fail')}
                  className="flex-1 py-4 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xl font-bold shadow-lg transition-all"
                >
                  × 失敗 (No Lift)
                </button>
              </div>
            </div>
          )}

          {/* 進行中がない場合 */}
          {!topItem && queue.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-xl text-center">
              <p className="text-gray-700 mb-4 font-medium">
                現在進行中の試技がありません
              </p>
              <button
                onClick={advanceToNext}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-colors"
              >
                次の試技を開始する
              </button>
            </div>
          )}

          {/* ── 試技順テーブル ─────────── */}
          {currentCompetition && queue.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">
                  試技順リスト（バーベル・ローデッド法）
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-gray-900 text-sm" key={refreshKey}>
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 w-12">
                        順位
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600">
                        選手名
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600">
                        所属
                      </th>
                      <th className="px-3 py-3 text-center font-semibold text-gray-600 w-16">
                        Lot
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-600">
                        重量
                      </th>
                      <th className="px-3 py-3 text-center font-semibold text-gray-600 w-24">
                        試技
                      </th>
                      <th className="px-3 py-3 text-center font-semibold text-gray-600 w-28">
                        操作
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {queue.map((item, idx) => {
                      const isTop = idx === 0;
                      return (
                        <tr
                          key={item.attempt_id}
                          className={`
                            border-b last:border-b-0 transition-all duration-500
                            ${
                              isTop
                                ? 'bg-yellow-100 border-l-4 border-l-red-500 animate-row-fade-in'
                                : 'hover:bg-gray-50 animate-row-fade-in'
                            }
                          `}
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          {/* 順位 */}
                          <td
                            className={`px-3 py-3 ${
                              isTop ? 'text-lg font-black text-red-600' : 'font-medium'
                            }`}
                          >
                            {idx + 1}
                          </td>

                          {/* 選手名 */}
                          <td
                            className={`px-3 py-3 font-semibold ${
                              isTop ? 'text-lg text-gray-900' : ''
                            }`}
                          >
                            {item.athlete_name}
                            {isTop && (
                              <span className="ml-2 inline-block px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full align-middle">
                                NOW
                              </span>
                            )}
                          </td>

                          {/* 所属 */}
                          <td className="px-3 py-3 text-gray-600">
                            {item.group_name}
                          </td>

                          {/* Lot */}
                          <td className="px-3 py-3 text-center text-gray-500">
                            {item.lot_number}
                          </td>

                          {/* 重量 */}
                          <td
                            className={`px-3 py-3 text-right tabular-nums font-bold ${
                              isTop ? 'text-xl text-indigo-700' : ''
                            }`}
                          >
                            {item.declared_weight}kg
                          </td>

                          {/* 試技回数 */}
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs text-gray-500">
                              {item.lift_type}
                            </span>
                            <br />
                            <span className="font-bold">
                              {item.attempt_number}/3
                            </span>
                          </td>

                          {/* 操作 */}
                          <td className="px-3 py-3 text-center">
                            {isTop ? (
                              <span className="text-xs text-gray-400">
                                ↑ 上のボタンで操作
                              </span>
                            ) : (
                              <button
                                onClick={() => setCurrentAttempt(item.attempt_id)}
                                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                              >
                                進行中にする
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentCompetition && queue.length === 0 && (
            <div className="bg-white p-10 rounded-xl shadow-sm text-center text-gray-400 text-lg">
              試技データがありません
            </div>
          )}
        </div>
      </div>

      {/* ── Animation Styles ─────────── */}
      <style jsx global>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }

        @keyframes highlight-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
        }
        .animate-highlight-pulse {
          animation: highlight-pulse 2s ease-in-out infinite;
        }

        @keyframes row-fade-in {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-row-fade-in {
          animation: row-fade-in 0.35s ease-out both;
        }
      `}</style>
    </>
  );
}
