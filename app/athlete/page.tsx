'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useCompetitionStore } from '@/lib/store/competition-store';
import { calculateWaitAttempts, buildAttemptQueue, liftTypeLabel, getCurrentLiftType } from '@/lib/wait-counter';
import WaitZoneSettingsForm from '@/app/components/WaitZoneSettingsForm';
import type { Competition, WaitCounterInfo } from '@/types';

export default function AthletePage() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [waitInfo, setWaitInfo] = useState<WaitCounterInfo | null>(null);

  const {
    currentCompetition,
    athletes,
    attempts,
    setCompetition,
    setAthletes,
    setAttempts,
  } = useCompetitionStore();

  // ── 大会一覧取得 ──────────────────
  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    const { data } = await supabase
      .from('wl_competitions')
      .select('*')
      .in('status', ['active', 'upcoming'])
      .order('date', { ascending: false });
    if (data) setCompetitions(data);
  };

  // ── 大会データ読み込み ────────────
  const loadCompetitionData = useCallback(
    async (compId: string) => {
      const { data: comp } = await supabase
        .from('wl_competitions')
        .select('*')
        .eq('id', compId)
        .single();
      if (comp) setCompetition(comp);

      const { data: athletesData } = await supabase
        .from('wl_athletes')
        .select('*')
        .eq('competition_id', compId)
        .order('name');
      if (athletesData) setAthletes(athletesData);

      const { data: attemptsData } = await supabase
        .from('wl_attempts')
        .select('*')
        .in('athlete_id', athletesData?.map((a) => a.id) ?? []);
      if (attemptsData) setAttempts(attemptsData);
    },
    [setCompetition, setAthletes, setAttempts]
  );

  // ── Realtime 購読 ─────────────────
  useEffect(() => {
    if (!selectedCompId) return;

    loadCompetitionData(selectedCompId);

    const channel = supabase
      .channel(`athlete-${selectedCompId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wl_attempts' },
        () => loadCompetitionData(selectedCompId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCompId, loadCompetitionData]);

  // ── 待機本数の再計算 ──────────────
  useEffect(() => {
    if (selectedAthleteId && currentCompetition) {
      const info = calculateWaitAttempts(
        selectedAthleteId,
        athletes,
        attempts,
        currentCompetition
      );
      setWaitInfo(info);
    } else {
      setWaitInfo(null);
    }
  }, [selectedAthleteId, athletes, attempts, currentCompetition]);

  // ── キュー構築 ────────────────────
  const queue =
    currentCompetition && athletes.length > 0
      ? buildAttemptQueue(athletes, attempts)
      : [];
  const currentAttempt = queue.find((q) => q.is_current);

  // ── Render ────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            選手用画面
          </h1>
          <Link
            href="/"
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← ホーム
          </Link>
        </div>

        {/* 大会選択 */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <label className="block text-lg font-semibold text-gray-700 mb-3">
            大会を選択
          </label>
          <select
            value={selectedCompId}
            onChange={(e) => {
              setSelectedCompId(e.target.value);
              setSelectedAthleteId('');
              setWaitInfo(null);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 text-base"
          >
            <option value="">-- 大会を選択してください --</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.date})
              </option>
            ))}
          </select>
        </div>

        {/* 選手選択 */}
        {selectedCompId && (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              選手を選択
            </label>
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 text-base"
            >
              <option value="">-- 選手を選択してください --</option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name} (#{athlete.lot_number})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── 待ち本数 個別設定 ─────── */}
        {selectedAthleteId && selectedCompId && (() => {
          const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
          if (!selectedAthlete) return null;
          return (
            <WaitZoneSettingsForm
              athlete={selectedAthlete}
              onSaved={() => loadCompetitionData(selectedCompId)}
            />
          );
        })()}

        {/* ── 現在のバー重量 ────────── */}
        {currentAttempt && (
          <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-lg text-center">
            <div className="text-sm uppercase tracking-wide mb-2">
              現在のバー重量
            </div>
            <div className="text-5xl md:text-6xl font-bold mb-2">
              {currentAttempt.declared_weight}kg
            </div>
            <div className="text-lg">
              {currentAttempt.athlete_name} — {liftTypeLabel(currentAttempt.lift_type)}{' '}
              {currentAttempt.attempt_number}回目
            </div>
          </div>
        )}

        {/* ── 待機本数 ──────────────── */}
        {waitInfo && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="text-center space-y-6">
              <div>
                <div className="text-xl text-gray-700 mb-1">
                  {waitInfo.athlete_name} さん
                </div>
                <div className="text-sm text-gray-500">
                  次の試技重量: {waitInfo.current_weight}kg
                </div>
              </div>

              <div className="py-8">
                <div className="text-6xl md:text-8xl font-bold text-indigo-600 mb-4">
                  {waitInfo.wait_count}
                </div>
                <div className="text-2xl md:text-3xl font-semibold text-gray-700">
                  本待ち
                </div>
              </div>

              {/* 内訳 */}
              {waitInfo.next_athletes.length > 0 && (
                <div className="border-t pt-6 text-left">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                    あなたより前の選手
                  </h3>
                  <div className="space-y-3">
                    {waitInfo.next_athletes.map((next, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">
                          {next.name}
                        </span>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            {next.weight}kg
                          </div>
                          <div className="text-sm text-gray-500">
                            予測 +{next.predicted_attempts}本
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 試技順 上位5件 ─────────── */}
        {selectedCompId && queue.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              次の試技順
            </h2>
            <div className="space-y-3">
              {queue.slice(0, 5).map((item, index) => (
                <div
                  key={item.attempt_id}
                  className={`p-4 rounded-lg ${
                    item.is_current
                      ? 'bg-indigo-100 border-2 border-indigo-500'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg text-gray-900">
                        {index + 1}. {item.athlete_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {liftTypeLabel(item.lift_type)} {item.attempt_number}回目
                        <span className="ml-2 text-gray-400">
                          Lot#{item.lot_number}
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {item.declared_weight}kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
