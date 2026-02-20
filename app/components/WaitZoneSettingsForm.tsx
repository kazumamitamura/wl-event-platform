'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Athlete } from '@/types';

interface Props {
  athlete: Athlete;
  onSaved: () => void;
}

export default function WaitZoneSettingsForm({ athlete, onSaved }: Props) {
  const [zone3, setZone3] = useState<number>(athlete.custom_zone_3 ?? 8);
  const [zone2, setZone2] = useState<number>(athlete.custom_zone_2 ?? 4);
  const [zone1, setZone1] = useState<number>(athlete.custom_zone_1 ?? 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const hasCustom =
    athlete.custom_zone_3 !== null ||
    athlete.custom_zone_2 !== null ||
    athlete.custom_zone_1 !== null;

  const handleSave = async () => {
    if (zone3 <= zone2 || zone2 <= zone1) {
      setMessage('値は 3本待ち > 2本待ち > 1本待ち の順に大きくしてください');
      return;
    }

    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('wl_athletes')
      .update({
        custom_zone_3: zone3,
        custom_zone_2: zone2,
        custom_zone_1: zone1,
      })
      .eq('id', athlete.id);

    setSaving(false);

    if (error) {
      setMessage('保存に失敗しました: ' + error.message);
      return;
    }

    setMessage('保存しました');
    onSaved();
  };

  const handleReset = async () => {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('wl_athletes')
      .update({
        custom_zone_3: null,
        custom_zone_2: null,
        custom_zone_1: null,
      })
      .eq('id', athlete.id);

    setSaving(false);

    if (error) {
      setMessage('リセットに失敗しました: ' + error.message);
      return;
    }

    setZone3(8);
    setZone2(4);
    setZone1(0);
    setMessage('大会デフォルト設定に戻しました');
    onSaved();
  };

  const rows: { label: string; value: number; setter: (v: number) => void; color: string }[] = [
    { label: '3本待ち', value: zone3, setter: setZone3, color: 'border-red-300 focus:border-red-500' },
    { label: '2本待ち', value: zone2, setter: setZone2, color: 'border-orange-300 focus:border-orange-500' },
    { label: '1本待ち', value: zone1, setter: setZone1, color: 'border-yellow-300 focus:border-yellow-500' },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          待ち本数の個別設定
        </h3>
        {hasCustom && (
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
            カスタム設定中
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-5">
        自分の重量と前の選手の重量差が下記の値以上なら、その本数分待ちとしてカウントします。
      </p>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-20 text-sm font-semibold text-gray-700 text-right shrink-0">
              {row.label}
            </span>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-gray-400">≥</span>
              <input
                type="number"
                value={row.value}
                onChange={(e) => {
                  row.setter(parseInt(e.target.value, 10) || 0);
                  setMessage('');
                }}
                className={`w-20 px-3 py-2 border-2 rounded-lg text-center text-lg font-bold text-gray-900 outline-none ${row.color}`}
              />
              <span className="text-sm text-gray-500">kg差</span>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <p className={`mt-4 text-sm text-center ${message.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      <div className="flex gap-3 mt-5">
        {hasCustom && (
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
          >
            デフォルトに戻す
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '完了'}
        </button>
      </div>
    </div>
  );
}
