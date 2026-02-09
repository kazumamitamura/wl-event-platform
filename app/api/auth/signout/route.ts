import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createClient();

  // Update logout time
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Find the latest login without logout
    const { data: logs } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', user.id)
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

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
