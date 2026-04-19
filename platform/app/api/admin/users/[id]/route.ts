import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';

function tempPassword() {
  return 'CB' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// PATCH /api/admin/users/[id] — edit or reset password
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  if (body.action === 'reset_password') {
    const temp = tempPassword();
    const hash = await bcrypt.hash(temp, 12);
    await supabaseAdmin.from('users').update({ password_hash: hash, is_temp_password: true }).eq('id', id);
    await writeAuditLog({ userId: session.userId, userEmail: session.email, action: 'PASSWORD_RESET', entityType: 'users', entityId: id });
    return NextResponse.json({ success: true, tempPassword: temp });
  }

  // Update fields
  const allowed: Record<string, unknown> = {};
  if (body.name) allowed.name = body.name;
  if (body.role) allowed.role = body.role;
  if (body.assignedProjectId !== undefined) allowed.assigned_project_id = body.assignedProjectId;
  if (body.isActive !== undefined) allowed.is_active = body.isActive;

  await supabaseAdmin.from('users').update(allowed).eq('id', id);
  await writeAuditLog({ userId: session.userId, userEmail: session.email, action: 'USER_UPDATED', entityType: 'users', entityId: id, newValue: allowed });

  return NextResponse.json({ success: true });
}
