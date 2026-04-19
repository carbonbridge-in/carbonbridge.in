import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';
import { writeAuditLog, createNotification, sendEmail, emailApprovalNotification } from '@/lib/utils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// GET /api/admin/submissions — all pending
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';

  const { data } = await supabaseAdmin
    .from('generation_data')
    .select(`*, projects(project_name, company_name, capacity_mw, cuf_factor, contact_email)`)
    .eq('status', status)
    .order('submitted_at', { ascending: false });

  return NextResponse.json({ submissions: data || [] });
}

// PATCH /api/admin/submissions/[id] — approve or reject
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, action, comment } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const { data: gen } = await supabaseAdmin
    .from('generation_data')
    .select('*, projects(project_name, contact_email, capacity_mw), submitted_by')
    .eq('id', id)
    .single();

  if (!gen) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabaseAdmin.from('generation_data').update({
    status: newStatus,
    admin_comment: comment || null,
    approved_by: session.userId,
    approved_at: new Date().toISOString(),
  }).eq('id', id);

  const monthName = MONTHS[(gen.month as number) - 1];

  // Notify the submitting user
  if (gen.submitted_by) {
    await createNotification({
      userId: gen.submitted_by,
      type: action === 'approve' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
      title: `Submission ${action === 'approve' ? 'Approved ✅' : 'Rejected ❌'}`,
      message: `${monthName} ${gen.year} data for ${(gen.projects as { project_name: string })?.project_name} has been ${newStatus}.${comment ? ` Comment: ${comment}` : ''}`,
      entityType: 'generation_data', entityId: id,
    });

    // Email
    const project = gen.projects as { project_name: string; contact_email: string };
    if (project?.contact_email) {
      await sendEmail(
        project.contact_email,
        `CarbonBridge — Submission ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        emailApprovalNotification(project.project_name, monthName, gen.year, action === 'approve', comment)
      );
    }
  }

  await writeAuditLog({
    userId: session.userId, userEmail: session.email,
    action: `SUBMISSION_${newStatus.toUpperCase()}`,
    entityType: 'generation_data', entityId: id,
    newValue: { status: newStatus, comment },
  });

  return NextResponse.json({ success: true, status: newStatus });
}
