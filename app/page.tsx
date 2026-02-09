'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import type { Profile } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('wl_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (data) setProfile(data);
        }
      } catch {
        /* not logged in */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setProfile(null);
      router.refresh();
    } catch {
      /* ignore */
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
            ウエイトリフティング
          </h1>
          <h2 className="text-2xl md:text-4xl font-semibold text-indigo-600">
            競技運営プラットフォーム
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
            リアルタイム進行管理と選手待機本数確認システム
          </p>
        </div>

        {/* ── ログイン状態表示 ──────── */}
        {!loading && (
          <div className="bg-white rounded-2xl shadow-md p-5">
            {profile ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-lg font-semibold text-gray-900">
                    {profile.full_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {profile.email}
                    <span className="ml-2 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                      {profile.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm"
                >
                  {signingOut ? 'ログアウト中...' : 'ログアウト'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 mb-3 text-sm">
                  ログインするとすべての機能が利用できます
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    href="/auth/signin"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors text-sm"
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-6 py-2.5 bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl font-semibold transition-colors text-sm"
                  >
                    新規登録
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* 選手用 */}
          <Link
            href="/athlete"
            className="block p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border-2 border-transparent hover:border-indigo-500"
          >
            <div className="space-y-4">
              <div className="text-4xl">🏋️</div>
              <h3 className="text-2xl font-bold text-gray-900">選手用</h3>
              <p className="text-gray-600">
                自分の待機本数をリアルタイムで確認
              </p>
              <div className="flex items-center text-indigo-600 font-semibold">
                <span>確認する</span>
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* 運営用 */}
          <Link
            href="/admin"
            className="block p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border-2 border-transparent hover:border-indigo-500"
          >
            <div className="space-y-4">
              <div className="text-4xl">⚙️</div>
              <h3 className="text-2xl font-bold text-gray-900">運営用</h3>
              <p className="text-gray-600">
                大会進行管理と結果入力
              </p>
              <div className="flex items-center text-indigo-600 font-semibold">
                <span>管理画面へ</span>
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
