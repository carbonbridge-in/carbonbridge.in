import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/admin/dashboard — stats
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [
    { count: totalProjects },
    { count: totalUsers },
    { count: pendingCount },
    { data: projects },
    { data: recentLogs },
  ] = await Promise.all([
    supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'CLIENT'),
    supabaseAdmin.from('generation_data').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('projects').select('id, project_name, capacity_mw, state, status, company_name').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(8),
  ]);

  // Totals from generation_data approved
  const { data: genTotals } = await supabaseAdmin
    .from('generation_data')
    .select('mwh_generated')
    .eq('status', 'approved');

  const totalMWh = (genTotals || []).reduce((s, r) => s + (r.mwh_generated || 0), 0);
  const totalCredits = +(totalMWh * 0.82).toFixed(0);

  // Total MW
  const { data: allProjects } = await supabaseAdmin.from('projects').select('capacity_mw');
  const totalMW = (allProjects || []).reduce((s, p) => s + (p.capacity_mw || 0), 0);

  // Monthly gen trend (last 6 months)
  const { data: trend } = await supabaseAdmin
    .from('generation_data')
    .select('month, year, mwh_generated')
    .eq('status', 'approved')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(12);

  return NextResponse.json({
    stats: {
      totalProjects: totalProjects || 0,
      totalClients: totalUsers || 0,
      pendingSubmissions: pendingCount || 0,
      totalMW: +totalMW.toFixed(2),
      totalMWh: +totalMWh.toFixed(0),
      totalCredits,
      estimatedRevenue: +(totalCredits * 300).toFixed(0),
    },
    recentProjects: projects || [],
    recentLogs: recentLogs || [],
    trend: (trend || []).reverse(),
  });
}
