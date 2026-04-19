'use client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard').then(r => r.json()).then(d => setData(d));
  }, []);

  if (!data) return <div className="p-8"><div className="skeleton h-32 w-full mb-4"></div><div className="skeleton h-64 w-full"></div></div>;

  return (
    <div className="animate-fadeUp">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">Platform Overview</h1>
        <p className="text-gray-500 font-medium mt-1 text-sm bg-[#E6F4EA] inline-block px-3 py-1 rounded-full text-[#3FAE5A]">
          India Solar Carbon Credit Portfolio · Verra/Gold Standard Track
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { l: 'Projects', v: data.stats.totalProjects, c: 'text-[#0B3D2E]' },
          { l: 'Total Capacity', v: `${data.stats.totalMW} MW`, c: 'text-amber-500' },
          { l: 'Carbon Credits', v: data.stats.totalCredits?.toLocaleString('en-IN') + ' tCO₂e', c: 'text-[#3FAE5A]' },
          { l: 'Pending Reviews', v: data.stats.pendingSubmissions, c: data.stats.pendingSubmissions > 0 ? 'text-amber-500' : 'text-gray-400' },
        ].map((s, i) => (
          <div key={i} className="stat-card flex flex-col justify-center">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.l}</div>
            <div className={`text-3xl font-extrabold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="col-span-2 card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900">Recent Projects</h2>
            <a href="/admin/projects" className="text-sm font-semibold text-[#3FAE5A] hover:underline">View All →</a>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Project</th><th>Capacity</th><th>Status</th></tr></thead>
              <tbody>
                {data.recentProjects.slice(0, 5).map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-semibold text-gray-900">{p.project_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{p.company_name} · {p.state}</div>
                    </td>
                    <td className="font-semibold text-amber-600">{p.capacity_mw} MW</td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  </tr>
                ))}
                {data.recentProjects.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-gray-400 py-8">No projects yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs Preview */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900">Activity Log</h2>
            <a href="/admin/audit" className="text-sm font-semibold text-[#3FAE5A] hover:underline">Full Log →</a>
          </div>
          <div className="space-y-4">
            {data.recentLogs.map((l: any) => (
              <div key={l.id} className="border-l-2 border-[#E6F4EA] pl-3 py-1">
                <div className="text-[13px] font-medium text-gray-800">{l.action.replace(/_/g, ' ')}</div>
                <div className="text-[11px] text-gray-500 mt-1 flex justify-between">
                  <span>{new Date(l.created_at).toLocaleDateString()}</span>
                  <span className="truncate ml-2 text-gray-400">{l.user_email || 'System'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
