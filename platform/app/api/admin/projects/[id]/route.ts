import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';

// GET /api/admin/projects/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { data: project } = await supabaseAdmin.from('projects').select('*').eq('id', id).single();
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: genData } = await supabaseAdmin.from('generation_data').select('*').eq('project_id', id).order('year', { ascending: false }).order('month', { ascending: false });
  const { data: docs } = await supabaseAdmin.from('documents').select('*').eq('project_id', id).order('uploaded_at', { ascending: false });
  return NextResponse.json({ project, generation_data: genData || [], documents: docs || [] });
}

// PATCH /api/admin/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const allowed = ['project_name','company_name','capacity_mw','state','district','village','latitude','longitude',
    'commissioning_date','discom','module_type','inverter_details','number_of_panels','substation',
    'contact_person','contact_email','contact_phone','methodology','status','crediting_period_start',
    'crediting_period_end','cuf_factor','grid_emission_factor'];

  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  const { error } = await supabaseAdmin.from('projects').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({ userId: session.userId, userEmail: session.email, action: 'PROJECT_UPDATED', entityType: 'projects', entityId: id, newValue: updates });
  return NextResponse.json({ success: true });
}
