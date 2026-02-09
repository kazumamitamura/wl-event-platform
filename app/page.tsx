'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

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

        <div className="text-center mt-8">
          <Link
            href="/auth/signin"
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            ログイン / 新規登録
          </Link>
        </div>
      </div>
    </div>
  );
}
