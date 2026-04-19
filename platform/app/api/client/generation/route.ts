import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';
import { calcMaxMWh, writeAuditLog, createNotification, sendEmail, emailSubmissionNotification } from '@/lib/utils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// GET /api/client/generation — all generation entries for client's project
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = session.role === 'ADMIN'
    ? new URL(req.url).searchParams.get('projectId')
    : session.assignedProjectId;

  if (!projectId) return NextResponse.json({ error: 'No project' }, { status: 400 });

  const { data } = await supabaseAdmin
    .from('generation_data')
    .select('*')
    .eq('project_id', projectId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  return NextResponse.json({ generation: data || [] });
}

// POST /api/client/generation — submit monthly data
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = session.assignedProjectId;
  if (!projectId) return NextResponse.json({ error: 'No project assigned' }, { status: 400 });

  const body = await req.json();
  const { month, year, mwh_generated, proof_file_url, proof_file_name, source_type, raw_data } = body;

  if (!month || !year || mwh_generated === undefined) {
    return NextResponse.json({ error: 'month, year, mwh_generated required' }, { status: 400 });
  }

  // Fetch project for capacity check
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('capacity_mw, cuf_factor, project_name, contact_email')
    .eq('id', projectId)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Range validation
  const maxMWh = calcMaxMWh(project.capacity_mw, project.cuf_factor || 0.19);
  if (mwh_generated > maxMWh) {
    return NextResponse.json({
      error: `MWh value too high. Max for this plant: ${maxMWh.toLocaleString('en-IN')} MWh/month (${project.capacity_mw} MW × CUF ${project.cuf_factor})`,
    }, { status: 400 });
  }

  // Duplicate check (DB constraint also catches this but give friendly message)
  const { data: existing } = await supabaseAdmin
    .from('generation_data')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('month', month)
    .eq('year', year)
    .single();

  if (existing) {
    return NextResponse.json({
      error: `Data for ${MONTHS[month - 1]} ${year} already submitted (status: ${existing.status}). Duplicates not allowed.`,
    }, { status: 409 });
  }

  // Insert
  const { data: gen, error } = await supabaseAdmin.from('generation_data').insert({
    project_id: projectId,
    month, year,
    mwh_generated: +mwh_generated,
    status: 'pending',
    submitted_by: session.userId,
    source_type: source_type || 'manual',
    proof_file_url: proof_file_url || null,
    proof_file_name: proof_file_name || null,
    raw_data: raw_data || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify all admins
  const { data: admins } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('role', 'ADMIN')
    .eq('is_active', true);

  for (const admin of admins || []) {
    await createNotification({
      userId: admin.id,
      type: 'NEW_SUBMISSION',
      title: 'New Generation Data Submitted',
      message: `${MONTHS[month - 1]} ${year} data submitted for ${project.project_name}`,
      entityType: 'generation_data', entityId: gen.id,
    });
    await sendEmail(
      admin.email,
      `CarbonBridge — New Submission: ${project.project_name}`,
      emailSubmissionNotification(project.project_name, MONTHS[month - 1], year, mwh_generated)
    );
  }

  await writeAuditLog({
    userId: session.userId, userEmail: session.email,
    action: 'GENERATION_SUBMITTED',
    entityType: 'generation_data', entityId: gen.id,
    newValue: { month, year, mwh_generated, projectId },
  });

  return NextResponse.json({ success: true, generation: gen });
}
