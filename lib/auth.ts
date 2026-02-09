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

/**
 * 新規登録
 * - メール確認が必要な場合は needsConfirmation: true を返す
 * - usage_logs の記録失敗は無視して登録自体は成功させる
 */
export async function signUp(data: SignUpData): Promise<SignUpResult> {
  const { email, password, full_name, category } = data;

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        category,
      },
    },
  });

  if (error) throw error;

  // Supabase がセッションを返さない → メール確認が必要
  if (!authData.session) {
    return {
      success: true,
      needsConfirmation: true,
      message: '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。',
    };
  }

  // セッションがある → そのままログイン状態になる
  try {
    await logUserLogin(authData.user!.id);
  } catch {
    // ログ記録失敗は無視
  }

  return {
    success: true,
    needsConfirmation: false,
    message: '登録が完了しました。',
  };
}

/**
 * ログイン
 */
export async function signIn(data: SignInData) {
  const { email, password } = data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Supabase の英語エラーを日本語に変換
    if (error.message === 'Invalid login credentials') {
      throw new Error('メールアドレスまたはパスワードが正しくありません。\n新規登録がお済みでない場合は「新規登録」からアカウントを作成してください。');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('メールアドレスの確認が完了していません。受信箱を確認し、確認メールのリンクをクリックしてください。');
    }
    throw new Error(error.message);
  }

  // 利用ログ記録（失敗しても無視）
  try {
    if (authData.user) {
      await logUserLogin(authData.user.id);
    }
  } catch {
    // ignore
  }

  return authData;
}

export async function signOut() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await logUserLogout(user.id);
    } catch {
      // ignore
    }
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

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

// ── Usage Logging ──────────────────────────
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
