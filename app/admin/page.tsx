'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/auth';
import { useCompetitionStore } from '@/lib/store/competition-store';
import { buildAttemptQueue, validateNextWeight } from '@/lib/wait-counter';
import type { Competition, AttemptQueueItem } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');

  // 次の重量入力用
  const [nextWeightInput, setNextWeightInput] = useState<string>('');
  const [weightError, setWeightError] = useState('');

  const {
    currentCompetition,
    athletes,
    attempts,
    setCompetition,
    setAthletes,
    setAttempts,
  } = useCompetitionStore();

  // ── Auth ──────────────────────────────
  useEffect(() => {
    checkAuth();
    loadCompetitions();
  }, []);

  const checkAuth = async () => {
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
  };

  // ── Data Loading ──────────────────────
  const loadCompetitions = async () => {
    const { data } = await supabase
      .from('competitions')
      .select('*')
      .order('date', { ascending: false });
    if (data) setCompetitions(data);
  };

  const loadCompetitionData = useCallback(async (compId: string) => {
    const { data: comp } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', compId)
      .single();
    if (comp) setCompetition(comp);

    const { data: athletesData } = await supabase
      .from('athletes')
      .select('*')
      .eq('competition_id', compId)
      .order('lot_number');
    if (athletesData) setAthletes(athletesData);

    const { data: attemptsData } = await supabase
      .from('attempts')
      .select('*')
      .in('athlete_id', athletesData?.map((a) => a.id) ?? []);
    if (attemptsData) setAttempts(attemptsData);
  }, [setCompetition, setAthletes, setAttempts]);

  // ── Realtime ──────────────────────────
  useEffect(() => {
    if (!selectedCompId) return;

    loadCompetitionData(selectedCompId);

    const channel = supabase
      .channel(`admin-${selectedCompId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attempts' },
        () => loadCompetitionData(selectedCompId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCompId, loadCompetitionData]);

  // ── Actions ───────────────────────────

  /** 試技を「進行中」にする */
  const setCurrentAttempt = async (attemptId: string) => {
    // 全フラグをクリア → 指定を true
    const athleteIds = athletes.map((a) => a.id);
    const allAttemptIds = attempts
      .filter((a) => athleteIds.includes(a.athlete_id))
      .map((a) => a.id);

    await supabase
      .from('attempts')
      .update({ is_current: false })
      .in('id', allAttemptIds);

    await supabase
      .from('attempts')
      .update({ is_current: true })
      .eq('id', attemptId);
  };

  /** 結果入力（成功 / 失敗） → 自動で次の試技を進行中にする */
  const handleResultUpdate = async (
    attemptId: string,
    result: 'success' | 'fail'
  ) => {
    // 結果をセット + is_current を外す
    await supabase
      .from('attempts')
      .update({ result, is_current: false })
      .eq('id', attemptId);

    // 最新キューを再構築して先頭を進行中にする
    // (Realtime で再読み込みされるが、即時UX のためにも手動で)
    await loadCompetitionData(selectedCompId);
  };

  /** 次の試技を自動で進行中にする（キューの先頭） */
  const advanceToNext = async () => {
    const q = buildAttemptQueue(athletes, attempts);
    const next = q.find((item) => !item.is_current);
    if (next) {
      await setCurrentAttempt(next.attempt_id);
    }
  };

  /** 選手の次の申告重量を変更する */
  const handleWeightChange = async (attemptId: string) => {
    setWeightError('');
    const newWeight = parseInt(nextWeightInput, 10);
    if (isNaN(newWeight) || newWeight <= 0) {
      setWeightError('有効な重量を入力してください');
      return;
    }

    const currentAttemptData = attempts.find((a) => a.id === attemptId);
    if (!currentAttemptData) return;

    // バリデーション: 同一選手の直前試技の結果に基づくチェック
    const prevAttempts = attempts
      .filter(
        (a) =>
          a.athlete_id === currentAttemptData.athlete_id &&
          a.lift_type === currentAttemptData.lift_type &&
          a.attempt_number < currentAttemptData.attempt_number
      )
      .sort((a, b) => b.attempt_number - a.attempt_number);

    if (prevAttempts.length > 0) {
      const prev = prevAttempts[0];
      const wasSuccess = prev.result === 'success';
      if (!validateNextWeight(prev.declared_weight, newWeight, wasSuccess)) {
        setWeightError(
          wasSuccess
            ? `前回 ${prev.declared_weight}kg 成功 → ${prev.declared_weight + 1}kg 以上が必要です`
            : `前回 ${prev.declared_weight}kg 失敗 → ${prev.declared_weight}kg 以上が必要です`
        );
        return;
      }
    }

    await supabase
      .from('attempts')
      .update({ declared_weight: newWeight })
      .eq('id', attemptId);

    setNextWeightInput('');
  };

  // ── Render ────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-900">読み込み中...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const queue =
    currentCompetition && athletes.length > 0
      ? buildAttemptQueue(athletes, attempts)
      : [];

  const currentItem = queue.find((q) => q.is_current);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">運営管理画面</h1>
          <Link
            href="/"
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← ホーム
          </Link>
        </div>

        {/* 大会選択 */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <label className="block text-lg font-semibold text-gray-700 mb-3">
            大会を選択
          </label>
          <select
            value={selectedCompId}
            onChange={(e) => setSelectedCompId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- 大会を選択してください --</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.date}) - {comp.status}
              </option>
            ))}
          </select>
        </div>

        {/* ── 現在進行中パネル ──────────── */}
        {currentItem && (
          <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-sm">
            <div className="text-sm uppercase tracking-wide mb-1">
              現在の試技
            </div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="text-4xl font-bold">
                  {currentItem.declared_weight}kg
                </div>
                <div className="text-lg mt-1">
                  {currentItem.athlete_name} — {currentItem.lift_type}{' '}
                  {currentItem.attempt_number}回目
                  <span className="ml-2 text-indigo-200">
                    (Lot#{currentItem.lot_number})
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    handleResultUpdate(currentItem.attempt_id, 'success')
                  }
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg transition-colors"
                >
                  成功 ○
                </button>
                <button
                  onClick={() =>
                    handleResultUpdate(currentItem.attempt_id, 'fail')
                  }
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-lg transition-colors"
                >
                  失敗 ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 次試技を進行中にするボタン (現在進行中がない場合) */}
        {!currentItem && queue.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 p-6 rounded-xl text-center">
            <p className="text-gray-700 mb-4">
              現在進行中の試技がありません
            </p>
            <button
              onClick={advanceToNext}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
            >
              次の試技を開始する
            </button>
          </div>
        )}

        {/* ── 試技順テーブル ────────────── */}
        {currentCompetition && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              試技順（バーベル・ローデッド法）
            </h2>

            {queue.length === 0 ? (
              <p className="text-gray-500">試技データがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-gray-900">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">
                        #
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">
                        選手名
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">
                        種目
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">
                        回数
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">
                        重量
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">
                        Lot
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">
                        状態
                      </th>
                      <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {queue.map((item, index) => (
                      <tr
                        key={item.attempt_id}
                        className={
                          item.is_current
                            ? 'bg-indigo-50 font-semibold'
                            : ''
                        }
                      >
                        <td className="px-3 py-3 text-sm">{index + 1}</td>
                        <td className="px-3 py-3 text-sm font-medium">
                          {item.athlete_name}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {item.lift_type}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {item.attempt_number}回目
                        </td>
                        <td className="px-3 py-3 text-sm font-bold">
                          {item.declared_weight}kg
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-500">
                          {item.lot_number}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {item.is_current && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                              進行中
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {!item.is_current && (
                            <button
                              onClick={() =>
                                setCurrentAttempt(item.attempt_id)
                              }
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700"
                            >
                              進行中にする
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 重量変更パネル ────────────── */}
        {currentCompetition && queue.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              重量変更
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              試技順の変更を行う選手の行を選択し、新しい申告重量を入力してください。
            </p>

            <div className="space-y-4">
              {queue.slice(0, 10).map((item) => (
                <div
                  key={item.attempt_id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg"
                >
                  <div className="flex-1 text-sm text-gray-900">
                    <span className="font-medium">{item.athlete_name}</span>{' '}
                    — {item.lift_type} {item.attempt_number}回目 (現在{' '}
                    {item.declared_weight}kg)
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="新重量"
                      className="w-24 px-3 py-2 border rounded-lg text-sm text-gray-900"
                      onFocus={() => setWeightError('')}
                      onChange={(e) => setNextWeightInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleWeightChange(item.attempt_id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleWeightChange(item.attempt_id)}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
                    >
                      変更
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {weightError && (
              <p className="mt-3 text-red-600 text-sm">{weightError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
