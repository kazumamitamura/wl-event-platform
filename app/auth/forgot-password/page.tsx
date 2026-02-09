'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">パスワードリセット</h2>
          <p className="mt-2 text-gray-600">
            登録済みのメールアドレスを入力してください
          </p>
        </div>

        {sent ? (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg space-y-3">
            <p className="font-semibold">リセットメールを送信しました</p>
            <p className="text-sm">
              <strong>{email}</strong> 宛にパスワードリセット用のメールを送信しました。
              メール内のリンクからパスワードを再設定してください。
            </p>
            <p className="text-sm text-gray-600">
              ※ メールが届かない場合は迷惑メールフォルダもご確認ください。
            </p>
            <Link
              href="/auth/signin"
              className="block text-center mt-4 py-2 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              ログインページへ
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '送信中...' : 'リセットメールを送信'}
            </button>
          </form>
        )}

        <div className="text-center space-y-2">
          <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm">
            ← ログインに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
