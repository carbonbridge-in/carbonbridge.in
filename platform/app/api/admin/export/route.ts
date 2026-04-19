import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/admin/export?format=csv|json
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const format = new URL(req.url).searchParams.get('format') || 'csv';

  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: genData } = await supabaseAdmin
    .from('generation_data')
    .select('*, projects(project_name,company_name,capacity_mw,state)')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (format === 'json') {
    const payload = {
      exported_at: new Date().toISOString(),
      schema: 'CarbonBridge MRV Export v1 — Verra/Gold Standard AMS-I.D',
      projects: projects || [],
      generation_data: genData || [],
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="carbonbridge_export_${Date.now()}.json"`,
      },
    });
  }

  // CSV
  const projHeaders = ['id','project_name','company_name','state','district','capacity_mw','status','commissioning_date','methodology','grid_emission_factor','cuf_factor','contact_person','contact_email','created_at'];
  const projRows = (projects || []).map(p => projHeaders.map(h => `"${String((p as Record<string,unknown>)[h] ?? '').replace(/"/g,'""')}"`).join(','));

  const genHeaders = ['id','project_name','company_name','year','month','mwh_generated','status','source_type','submitted_at','approved_at','admin_comment'];
  const genRows = (genData || []).map(g => {
    const proj = g.projects as Record<string,unknown> | null;
    return genHeaders.map(h => {
      const v = h === 'project_name' ? proj?.project_name : h === 'company_name' ? proj?.company_name : (g as Record<string,unknown>)[h];
      return `"${String(v ?? '').replace(/"/g,'""')}"`;
    }).join(',');
  });

  const csv = [
    '=== PROJECTS ===',
    projHeaders.join(','),
    ...projRows,
    '',
    '=== GENERATION DATA ===',
    genHeaders.join(','),
    ...genRows,
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="carbonbridge_export_${Date.now()}.csv"`,
    },
  });
}
