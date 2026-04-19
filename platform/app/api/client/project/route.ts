import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/client/project — client's assigned project
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = session.assignedProjectId;
  if (!projectId) return NextResponse.json({ error: 'No project assigned' }, { status: 404 });

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Get generation summary
  const { data: genData } = await supabaseAdmin
    .from('generation_data')
    .select('*')
    .eq('project_id', projectId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  const approved = (genData || []).filter(g => g.status === 'approved');
  const totalMWh = approved.reduce((s, g) => s + (g.mwh_generated || 0), 0);
  const totalCredits = +(totalMWh * (project.grid_emission_factor || 0.82)).toFixed(0);

  return NextResponse.json({
    project,
    generation_data: genData || [],
    summary: {
      totalMWh: +totalMWh.toFixed(0),
      totalCredits,
      estimatedRevenue: +(totalCredits * 300).toFixed(0),
      approvedCount: approved.length,
      pendingCount: (genData || []).filter(g => g.status === 'pending').length,
    },
  });
}
