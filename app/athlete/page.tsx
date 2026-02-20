'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useCompetitionStore } from '@/lib/store/competition-store';
import { calculateWaitAttempts, buildAttemptQueue, liftTypeLabel, getCurrentLiftType } from '@/lib/wait-counter';
import WaitZoneSettingsForm from '@/app/components/WaitZoneSettingsForm';
import type { Competition, WaitCounterInfo } from '@/types';

export default function AthletePage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [waitInfo, setWaitInfo] = useState<WaitCounterInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const {
    currentCompetition,
    athletes,
    attempts,
    setCompetition,
    setAthletes,
    setAttempts,
  } = useCompetitionStore();

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

  // ── Realtime ─────────────────────
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

  const queue =
    currentCompetition && athletes.length > 0
      ? buildAttemptQueue(athletes, attempts)
      : [];
  const currentAttempt = queue.find((q) => q.is_current);
  const currentPhase = attempts.length > 0 ? getCurrentLiftType(attempts) : null;
  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl shadow-lg flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            選手用画面
          </h1>
          <Link
            href="/"
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
          >
            ← ホーム
          </Link>
        </div>

        {/* 大会選択 */}
        <div className="bg-white p-5 rounded-2xl shadow-lg">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
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
          <div className="bg-white p-5 rounded-2xl shadow-lg">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              選手を選択
            </label>
            <select
              value={selectedAthleteId}
              onChange={(e) => {
                setSelectedAthleteId(e.target.value);
                setShowSettings(false);
              }}
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

        {/* ═══════════════════════════════════════
            メインダッシュボード（選手選択後に表示）
           ═══════════════════════════════════════ */}
        {selectedAthleteId && waitInfo && (
          <>
            {/* ── フェーズ表示 ──────────── */}
            {currentPhase && (
              <div className={`p-3 rounded-xl text-center font-bold text-sm ${
                currentPhase === 'Snatch'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {liftTypeLabel(currentPhase)}
              </div>
            )}

            {/* ── 待機本数メインカード ──── */}
            <div className={`rounded-2xl shadow-xl overflow-hidden ${
              waitInfo.is_next
                ? 'bg-gradient-to-br from-red-500 to-orange-500'
                : waitInfo.wait_count === 0
                ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                : 'bg-gradient-to-br from-indigo-600 to-blue-700'
            }`}>
              <div className="p-8 text-white text-center">
                {/* 選手情報 */}
                <div className="text-lg opacity-90 mb-1">
                  {waitInfo.athlete_name}
                </div>
                <div className="text-sm opacity-75 mb-6">
                  次の試技: {waitInfo.current_weight}kg
                  {waitInfo.queue_position > 0 && (
                    <span className="ml-2">
                      （キュー {waitInfo.queue_position}番目）
                    </span>
                  )}
                </div>

                {/* メイン表示 */}
                {waitInfo.is_next ? (
                  <div>
                    <div className="text-2xl font-bold mb-2">あなたの出番です！</div>
                    <div className="text-8xl md:text-9xl font-black">NOW</div>
                  </div>
                ) : waitInfo.wait_count === 0 ? (
                  <div>
                    <div className="text-xl mb-2">あなたの出番まで</div>
                    <div className="text-8xl md:text-9xl font-black mb-2">0</div>
                    <div className="text-2xl font-semibold">準備してください</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xl mb-2">あなたの出番まで あと</div>
                    <div className="text-8xl md:text-9xl font-black tabular-nums mb-2">
                      {waitInfo.wait_count}
                    </div>
                    <div className="text-3xl font-semibold">本</div>
                  </div>
                )}

                {/* 使用中の Zone 設定 */}
                <div className="mt-6 pt-4 border-t border-white/20 text-sm opacity-75">
                  <span className={waitInfo.zones_used.is_custom ? 'font-bold opacity-100' : ''}>
                    {waitInfo.zones_used.is_custom ? '個別設定' : '大会設定'}
                  </span>
                  {' '}— 3本: ≥{waitInfo.zones_used.z3}kg / 2本: ≥{waitInfo.zones_used.z2}kg / 1本: ≥{waitInfo.zones_used.z1}kg
                </div>
              </div>
            </div>

            {/* ── 現在のバー重量 ────────── */}
            {currentAttempt && (
              <div className="bg-white p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">現在のバー重量</div>
                    <div className="text-3xl md:text-4xl font-black text-indigo-600 tabular-nums">
                      {currentAttempt.declared_weight}kg
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {currentAttempt.athlete_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {liftTypeLabel(currentAttempt.lift_type)} {currentAttempt.attempt_number}回目
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 内訳 (折りたたみ) ──────── */}
            {waitInfo.next_athletes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-900">
                    計算内訳（前の選手 {waitInfo.next_athletes.length}人）
                  </span>
                  <span className="text-gray-400 text-xl">
                    {showBreakdown ? '▲' : '▼'}
                  </span>
                </button>

                {showBreakdown && (
                  <div className="px-5 pb-5">
                    {/* テーブルヘッダー */}
                    <div className="grid grid-cols-12 gap-1 text-xs text-gray-500 font-semibold pb-2 border-b mb-2">
                      <div className="col-span-3">選手</div>
                      <div className="col-span-2 text-right">重量</div>
                      <div className="col-span-2 text-right">差</div>
                      <div className="col-span-2 text-center">残り</div>
                      <div className="col-span-3 text-right">加算</div>
                    </div>

                    {waitInfo.next_athletes.map((next, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-1 items-center py-2 border-b border-gray-100 last:border-0 text-sm"
                      >
                        <div className="col-span-3 font-medium text-gray-900 truncate">
                          {next.name}
                        </div>
                        <div className="col-span-2 text-right tabular-nums text-gray-700">
                          {next.weight}kg
                        </div>
                        <div className="col-span-2 text-right tabular-nums text-gray-500">
                          {next.diff}kg
                        </div>
                        <div className="col-span-2 text-center tabular-nums text-gray-500">
                          {next.remaining}本
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold tabular-nums text-xs">
                            +{next.predicted_attempts}本
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* 合計 */}
                    <div className="grid grid-cols-12 gap-1 items-center pt-3 mt-2 border-t-2 border-gray-200 font-bold text-sm">
                      <div className="col-span-9 text-right text-gray-700">合計</div>
                      <div className="col-span-3 text-right">
                        <span className="inline-block px-3 py-1 bg-indigo-600 text-white rounded-full tabular-nums">
                          {waitInfo.wait_count}本
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Zone 設定 (折りたたみ) ─── */}
            {selectedAthlete && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">待ち本数の個別設定</span>
                    {waitInfo.zones_used.is_custom && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        カスタム
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xl">
                    {showSettings ? '▲' : '▼'}
                  </span>
                </button>

                {showSettings && (
                  <div className="px-5 pb-5">
                    <WaitZoneSettingsForm
                      athlete={selectedAthlete}
                      onSaved={() => loadCompetitionData(selectedCompId)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── 試技順 上位5件 ─────────── */}
            {queue.length > 0 && (
              <div className="bg-white p-5 rounded-2xl shadow-lg">
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  次の試技順
                </h2>
                <div className="space-y-2">
                  {queue.slice(0, 5).map((item, index) => {
                    const isMe = item.athlete_id === selectedAthleteId;
                    return (
                      <div
                        key={item.attempt_id}
                        className={`p-3 rounded-lg flex justify-between items-center ${
                          item.is_current
                            ? 'bg-red-50 border-2 border-red-400'
                            : isMe
                            ? 'bg-indigo-50 border-2 border-indigo-400'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold w-6 text-center ${
                            item.is_current ? 'text-red-600' : isMe ? 'text-indigo-600' : 'text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <div className={`font-semibold ${isMe ? 'text-indigo-700' : 'text-gray-900'}`}>
                              {item.athlete_name}
                              {isMe && <span className="ml-1.5 text-xs text-indigo-500">← あなた</span>}
                              {item.is_current && <span className="ml-1.5 text-xs text-red-500">NOW</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {liftTypeLabel(item.lift_type)} {item.attempt_number}回目
                            </div>
                          </div>
                        </div>
                        <div className={`text-xl font-bold tabular-nums ${isMe ? 'text-indigo-600' : 'text-gray-700'}`}>
                          {item.declared_weight}kg
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
