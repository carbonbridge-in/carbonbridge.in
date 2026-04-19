import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { signToken } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await writeAuditLog({ userEmail: email, action: 'LOGIN_FAILED', ipAddress: req.headers.get('x-forwarded-for') || '' });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login
    await supabaseAdmin.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      assignedProjectId: user.assigned_project_id,
      isTempPassword: user.is_temp_password,
    });

    await writeAuditLog({
      userId: user.id, userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      ipAddress: req.headers.get('x-forwarded-for') || '',
    });

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, isTempPassword: user.is_temp_password },
      redirectTo: user.is_temp_password ? '/change-password' : user.role === 'ADMIN' ? '/admin' : '/dashboard',
    });

    res.cookies.set('cb_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24h
      path: '/',
    });

    return res;
  } catch (e) {
    console.error('[Login Error]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
