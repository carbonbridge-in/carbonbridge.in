import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';

/**
 * POST /api/ingest/manual-upload
 *
 * Accepts:
 *  - Manual form data (month, year, mwh)
 *  - CSV text (auto-parse multiple months)
 *  - SCADA JSON payload
 *  - Bill image/PDF → extracts mwh from metadata
 *
 * source_type: 'manual' | 'csv' | 'api' | 'bill_upload'
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = session.role === 'CLIENT' ? session.assignedProjectId : undefined;
  const body = await req.json();
  const { source_type, entries, project_id, raw_data } = body;

  const targetProjectId = session.role === 'ADMIN' ? (project_id || projectId) : projectId;
  if (!targetProjectId) return NextResponse.json({ error: 'No project ID' }, { status: 400 });

  // `entries` is an array: [{month, year, mwh_generated}, ...]
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'entries array required' }, { status: 400 });
  }

  const results = [];
  const errors = [];

  for (const entry of entries) {
    const { month, year, mwh_generated } = entry;
    if (!month || !year || mwh_generated === undefined) {
      errors.push({ entry, error: 'Missing fields' });
      continue;
    }

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from('generation_data')
      .select('id, status')
      .eq('project_id', targetProjectId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (existing) {
      errors.push({ entry, error: `Already submitted for ${month}/${year} (${existing.status})` });
      continue;
    }

    const { data: gen, error: insertErr } = await supabaseAdmin
      .from('generation_data')
      .insert({
        project_id: targetProjectId,
        month, year,
        mwh_generated: +mwh_generated,
        status: session.role === 'ADMIN' ? 'approved' : 'pending',
        submitted_by: session.userId,
        source_type: source_type || 'manual',
        raw_data: raw_data || null,
        approved_by: session.role === 'ADMIN' ? session.userId : null,
        approved_at: session.role === 'ADMIN' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertErr) {
      errors.push({ entry, error: insertErr.message });
    } else {
      results.push(gen);
    }
  }

  await writeAuditLog({
    userId: session.userId, userEmail: session.email,
    action: 'BULK_GENERATION_INGEST',
    entityType: 'generation_data', entityId: targetProjectId,
    newValue: { source_type, inserted: results.length, errors: errors.length },
  });

  return NextResponse.json({ success: true, inserted: results.length, errors });
}
