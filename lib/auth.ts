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

export async function signUp(data: SignUpData) {
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

  // Log usage
  if (authData.user) {
    await logUserLogin(authData.user.id);
  }

  return authData;
}

export async function signIn(data: SignInData) {
  const { email, password } = data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Log usage
  if (authData.user) {
    await logUserLogin(authData.user.id);
  }

  return authData;
}

export async function signOut() {
  // Update logout time
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await logUserLogout(user.id);
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
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

// Usage logging functions
async function logUserLogin(userId: string) {
  const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

  const { error } = await supabase
    .from('usage_logs')
    .insert({
      user_id: userId,
      device_info: deviceInfo,
    });

  if (error) console.error('Failed to log user login:', error);
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
    const { error } = await supabase
      .from('usage_logs')
      .update({ logout_at: new Date().toISOString() })
      .eq('id', logs[0].id);

    if (error) console.error('Failed to log user logout:', error);
  }
}
