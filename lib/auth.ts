import { supabase } from './supabase/client';
import type { UserCategory } from '@/types';

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  category: UserCategory;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpResult {
  success: boolean;
  needsConfirmation: boolean;
  message: string;
}

// ─── Sign Up ─────────────────────────────
export async function signUp(data: SignUpData): Promise<SignUpResult> {
  const { email, password, full_name, category } = data;

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, category },
    },
  });

  if (error) {
    // 日本語エラーに変換
    const msg = error.message;
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      throw new Error(
        'このメールアドレスは既に登録されています。\nログインページからログインするか、パスワードをお忘れの場合は「パスワードリセット」をお試しください。'
      );
    }
    if (msg.includes('valid email')) {
      throw new Error('有効なメールアドレスを入力してください。');
    }
    if (msg.includes('least 6')) {
      throw new Error('パスワードは6文字以上で入力してください。');
    }
    throw new Error(msg);
  }

  // ── Supabase の応答パターンで分岐 ──
  // パターン A: セッション無し → メール確認が必要
  if (!authData.session) {
    return {
      success: true,
      needsConfirmation: true,
      message:
        '登録用の確認メールを送信しました。\nメール内のリンクをクリックして登録を完了してください。\n\n※ メールが届かない場合は迷惑メールフォルダもご確認ください。',
    };
  }

  // パターン B: セッション有り → 即時ログイン
  try {
    await logUserLogin(authData.user!.id);
  } catch {
    /* ignore */
  }

  return {
    success: true,
    needsConfirmation: false,
    message: '登録が完了しました。',
  };
}

// ─── Sign In ─────────────────────────────
export async function signIn(data: SignInData) {
  const { email, password } = data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = error.message;

    if (msg === 'Invalid login credentials') {
      throw new Error(
        'メールアドレスまたはパスワードが正しくありません。\n\n' +
          '考えられる原因:\n' +
          '• パスワードが間違っている\n' +
          '• メール確認がまだ完了していない\n' +
          '• アカウントが存在しない\n\n' +
          'パスワードをお忘れの場合は下の「パスワードリセット」をお試しください。'
      );
    }
    if (msg.includes('Email not confirmed')) {
      throw new Error(
        'メールアドレスの確認が完了していません。\n受信箱(迷惑メールフォルダ含む)を確認し、確認メールのリンクをクリックしてください。'
      );
    }
    throw new Error(msg);
  }

  try {
    if (authData.user) {
      await logUserLogin(authData.user.id);
    }
  } catch {
    /* ignore */
  }

  return authData;
}

// ─── Password Reset ──────────────────────
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    if (error.message.includes('rate limit')) {
      throw new Error('リクエスト回数の上限に達しました。しばらく待ってから再度お試しください。');
    }
    throw new Error(error.message);
  }
}

// ─── Sign Out ────────────────────────────
export async function signOut() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await logUserLogout(user.id);
    } catch {
      /* ignore */
    }
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Helpers ─────────────────────────────
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

// ─── Usage Logging ───────────────────────
async function logUserLogin(userId: string) {
  const deviceInfo =
    typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

  await supabase.from('usage_logs').insert({
    user_id: userId,
    device_info: deviceInfo,
  });
}

async function logUserLogout(userId: string) {
  const { data: logs } = await supabase
    .from('usage_logs')
    .select('*')
    .eq('user_id', userId)
    .is('logout_at', null)
    .order('login_at', { ascending: false })
    .limit(1);

  if (logs && logs.length > 0) {
    await supabase
      .from('usage_logs')
      .update({ logout_at: new Date().toISOString() })
      .eq('id', logs[0].id);
  }
}
