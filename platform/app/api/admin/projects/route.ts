import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';
import { projectHash, writeAuditLog } from '@/lib/utils';

// GET /api/admin/projects
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const state   = searchParams.get('state');
  const status  = searchParams.get('status');
  const search  = searchParams.get('search');

  let query = supabaseAdmin.from('projects').select('*').order('created_at', { ascending: false });
  if (state)  query = query.eq('state', state);
  if (status) query = query.eq('status', status);
  if (search) query = query.or(`project_name.ilike.%${search}%,company_name.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

// POST /api/admin/projects — create project
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const {
    project_name, company_name, capacity_mw, state, district, village,
    latitude, longitude, commissioning_date, discom, module_type,
    inverter_details, number_of_panels, substation, contact_person,
    contact_email, contact_phone, methodology, status,
    crediting_period_start, crediting_period_end, cuf_factor,
  } = body;

  if (!project_name || !company_name || !capacity_mw) {
    return NextResponse.json({ error: 'project_name, company_name, capacity_mw required' }, { status: 400 });
  }

  const hash = projectHash(company_name, latitude || 0, longitude || 0, capacity_mw);

  // Duplicate check
  const { data: existing } = await supabaseAdmin.from('projects').select('id').eq('project_hash', hash).single();
  if (existing) {
    return NextResponse.json({ error: 'Duplicate project detected (same company + location + MW)' }, { status: 409 });
  }

  const { data: project, error } = await supabaseAdmin.from('projects').insert({
    project_name, company_name, capacity_mw, state, district, village,
    latitude, longitude, commissioning_date, discom, module_type,
    inverter_details, number_of_panels, substation, contact_person,
    contact_email, contact_phone,
    methodology: methodology || 'AMS-I.D',
    status: status || 'draft',
    crediting_period_start, crediting_period_end,
    cuf_factor: cuf_factor || 0.19,
    project_hash: hash,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.userId, userEmail: session.email,
    action: 'PROJECT_CREATED', entityType: 'projects', entityId: project.id,
    newValue: { project_name, company_name, capacity_mw },
  });

  return NextResponse.json({ success: true, project });
}
