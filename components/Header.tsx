'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { useAuthStore } from '@/lib/store/auth-store';

export default function Header() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            WL Platform
          </Link>

          <nav className="flex items-center space-x-4">
            {user && profile ? (
              <>
                <span className="text-sm text-gray-600">
                  {profile.full_name} ({profile.category})
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                ログイン
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
