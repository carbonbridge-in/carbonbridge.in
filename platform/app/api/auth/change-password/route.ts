import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest, signToken } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await supabaseAdmin.from('users')
      .update({ password_hash: hash, is_temp_password: false })
      .eq('id', session.userId);

    await writeAuditLog({ userId: session.userId, userEmail: session.email, action: 'PASSWORD_CHANGED' });

    // Re-issue token without isTempPassword
    const newToken = await signToken({ ...session, isTempPassword: false });

    const res = NextResponse.json({ success: true });
    res.cookies.set('cb_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
