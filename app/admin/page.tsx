'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/auth';
import { useCompetitionStore } from '@/lib/store/competition-store';
import { buildAttemptQueue } from '@/lib/wait-counter';
import type { Competition, AttemptQueueItem } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');

  const { currentCompetition, athletes, attempts, setCompetition, setAthletes, setAttempts } =
    useCompetitionStore();

  useEffect(() => {
    checkAuth();
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompId) {
      loadCompetitionData(selectedCompId);
      subscribeToChanges(selectedCompId);
    }
  }, [selectedCompId]);

  const checkAuth = async () => {
    try {
      const profile = await getCurrentProfile();
      if (!profile || profile.category !== '運営') {
        router.push('/auth/signin');
        return;
      }
      setIsAdmin(true);
    } catch (error) {
      router.push('/auth/signin');
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitions = async () => {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .order('date', { ascending: false });

    if (data) setCompetitions(data);
  };

  const loadCompetitionData = async (compId: string) => {
    // Load competition
    const { data: comp } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', compId)
      .single();

    if (comp) setCompetition(comp);

    // Load athletes
    const { data: athletesData } = await supabase
      .from('athletes')
      .select('*')
      .eq('competition_id', compId)
      .order('lot_number');

    if (athletesData) setAthletes(athletesData);

    // Load attempts
    const { data: attemptsData } = await supabase
      .from('attempts')
      .select('*')
      .in(
        'athlete_id',
        athletesData?.map((a) => a.id) || []
      );

    if (attemptsData) setAttempts(attemptsData);
  };

  const subscribeToChanges = (compId: string) => {
    const channel = supabase
      .channel('admin-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attempts' },
        (payload) => {
          loadCompetitionData(compId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleResultUpdate = async (attemptId: string, result: 'success' | 'fail') => {
    await supabase
      .from('attempts')
      .update({ result, is_current: false })
      .eq('id', attemptId);
  };

  const setCurrentAttempt = async (attemptId: string) => {
    // Clear all current flags
    await supabase.from('attempts').update({ is_current: false }).neq('id', '00000000-0000-0000-0000-000000000000');

    // Set new current
    await supabase.from('attempts').update({ is_current: true }).eq('id', attemptId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const queue = currentCompetition && athletes.length > 0 ? buildAttemptQueue(athletes, attempts) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">運営管理画面</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← ホーム
            </button>
          </div>
        </div>

        {/* Competition Selector */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <label className="block text-lg font-semibold text-gray-700 mb-3">
            大会を選択
          </label>
          <select
            value={selectedCompId}
            onChange={(e) => setSelectedCompId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- 大会を選択してください --</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.date}) - {comp.status}
              </option>
            ))}
          </select>
        </div>

        {/* Attempt Queue */}
        {currentCompetition && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">試技順</h2>
            
            {queue.length === 0 ? (
              <p className="text-gray-500">試技データがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">順番</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">選手名</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">種目</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">回数</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">重量</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状態</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {queue.slice(0, 20).map((item, index) => (
                      <tr
                        key={item.attempt_id}
                        className={item.is_current ? 'bg-indigo-50' : ''}
                      >
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{item.athlete_name}</td>
                        <td className="px-4 py-3 text-sm">{item.lift_type}</td>
                        <td className="px-4 py-3 text-sm">{item.attempt_number}回目</td>
                        <td className="px-4 py-3 text-sm font-bold">{item.declared_weight}kg</td>
                        <td className="px-4 py-3 text-sm">
                          {item.is_current && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                              進行中
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm space-x-2">
                          {!item.is_current && (
                            <button
                              onClick={() => setCurrentAttempt(item.attempt_id)}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            >
                              進行中にする
                            </button>
                          )}
                          {item.is_current && (
                            <>
                              <button
                                onClick={() => handleResultUpdate(item.attempt_id, 'success')}
                                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
                              >
                                成功
                              </button>
                              <button
                                onClick={() => handleResultUpdate(item.attempt_id, 'fail')}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                              >
                                失敗
                              </button>
                            </>
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
      </div>
    </div>
  );
}
