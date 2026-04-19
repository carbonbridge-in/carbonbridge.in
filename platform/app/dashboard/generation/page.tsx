'use client';
import { useState, useEffect } from 'react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ClientGenerationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/generation')
      .then(r => r.json())
      .then(d => {
        setData(d.generation || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8"><div className="skeleton h-64 w-full"></div></div>;

  return (
    <div className="animate-fadeUp">
      <div className="mb-8">
         <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">Generation Data</h1>
         <p className="text-gray-500 font-medium mt-1">Monthly MWh submitted for carbon crediting</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Status</th>
                <th>Net MWh</th>
                <th>Est. Credits</th>
                <th>Submitted On</th>
                <th>Admin Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.map(g => (
                <tr key={g.id}>
                  <td className="font-semibold text-gray-900">{MONTHS[g.month - 1]} {g.year}</td>
                  <td><span className={`badge badge-${g.status}`}>{g.status}</span></td>
                  <td className="font-mono font-medium text-gray-700">{g.mwh_generated.toLocaleString('en-IN')}</td>
                  <td className="font-mono font-medium text-[#3FAE5A]">{(g.mwh_generated * 0.82).toFixed(1)}</td>
                  <td className="text-[12px] text-gray-500">{new Date(g.submitted_at).toLocaleDateString()}</td>
                  <td className="text-[12px] italic text-gray-500">{g.admin_comment || '—'}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="text-4xl mb-3">📭</div>
                    <div className="text-gray-900 font-bold">No generation data</div>
                    <div className="text-sm text-gray-500 mt-1">You haven't submitted any monthly data yet.</div>
                    <a href="/dashboard/submit" className="btn-secondary mt-4 text-xs font-semibold">Submit Data Now</a>
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
