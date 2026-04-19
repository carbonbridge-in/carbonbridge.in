'use client';
import { useState, useEffect } from 'react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdminSubmissionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/submissions?status=pending')
      .then(r => r.json())
      .then(d => {
        setData(d.submissions || []);
        setLoading(false);
      });
  }, []);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    let comment = '';
    if (action === 'reject') {
      const p = prompt('Reason for rejection:');
      if (p === null) return;
      comment = p;
    }

    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/submissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, comment }),
      });
      if (res.ok) {
        setData(data.filter(s => s.id !== id));
      } else {
        alert('Action failed');
      }
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return <div className="p-8"><div className="skeleton h-64 w-full"></div></div>;

  return (
    <div className="animate-fadeUp">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">Pending Submissions</h1>
        <p className="text-gray-500 font-medium mt-1">Review generation data submitted by clients</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Period</th>
                <th>Net MWh</th>
                <th>Verification Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map(s => {
                const max = s.projects?.capacity_mw * 24 * 31 * (s.projects?.cuf_factor || 0.19);
                const isHigh = s.mwh_generated > (max * 0.95);

                return (
                  <tr key={s.id}>
                    <td>
                      <div className="font-semibold text-gray-900">{s.projects?.project_name}</div>
                      <div className="text-[12px] text-gray-500">{s.projects?.company_name}</div>
                    </td>
                    <td className="font-semibold text-gray-900">{MONTHS[s.month - 1]} {s.year}</td>
                    <td>
                      <span className={`font-mono font-bold ${isHigh ? 'text-amber-600' : 'text-gray-900'}`}>
                        {s.mwh_generated.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      {isHigh ? (
                        <div className="text-[11px] font-bold text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-200">
                          ⚠ High CUF (Near theoretical plant limit)
                        </div>
                      ) : (
                        <div className="text-[11px] text-green-700 bg-green-50 inline-block px-2 py-0.5 rounded border border-green-200">
                          ✅ Within plant parameters
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAction(s.id, 'approve')} 
                          disabled={actioningId === s.id}
                          className="btn-green text-xs px-3 py-1.5"
                        >Approve</button>
                        <button 
                          onClick={() => handleAction(s.id, 'reject')}
                          disabled={actioningId === s.id}
                          className="btn-danger text-xs px-3 py-1.5"
                        >Reject</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <div className="text-4xl mb-3">✅</div>
                    <div className="text-gray-900 font-bold">Inbox zero</div>
                    <div className="text-sm text-gray-500 mt-1">All client submissions have been processed.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
