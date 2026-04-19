import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';
import { writeAuditLog, sendEmail, emailNewUser } from '@/lib/utils';

function tempPassword() {
  return 'CB' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, is_temp_password, assigned_project_id, created_at, last_login, is_active')
    .order('created_at', { ascending: false });

  return NextResponse.json({ users: data || [] });
}

// POST /api/admin/users — create user
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, name, role, assignedProjectId } = await req.json();
  if (!email || !name || !role) return NextResponse.json({ error: 'email, name, role required' }, { status: 400 });

  const temp = tempPassword();
  const hash = await bcrypt.hash(temp, 12);

  const { data: user, error } = await supabaseAdmin.from('users').insert({
    email: email.toLowerCase().trim(),
    name,
    role,
    password_hash: hash,
    is_temp_password: true,
    assigned_project_id: assignedProjectId || null,
    created_by: session.userId,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  // Send welcome email
  await sendEmail(email, 'Welcome to CarbonBridge — Your Login Credentials', emailNewUser(name, email, temp));

  await writeAuditLog({
    userId: session.userId, userEmail: session.email,
    action: 'USER_CREATED', entityType: 'users', entityId: user.id,
    newValue: { email, name, role },
  });

  return NextResponse.json({ success: true, tempPassword: temp, user });
}
