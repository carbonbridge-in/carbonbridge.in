'use client';
import { useState, useEffect } from 'react';

export default function ClientDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/project')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8"><div className="skeleton h-32 w-full mb-4"></div></div>;
  if (data.error) return <div className="p-8 alert alert-error">{data.error}. Contact your admin to configure your account.</div>;

  const { project, summary } = data;

  return (
    <div className="animate-fadeUp">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">{project.project_name}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={`badge badge-${project.status === 'draft' ? 'draft' : project.status === 'monitoring' ? 'monitoring' : 'registered'}`}>
            {project.status.toUpperCase()}
          </span>
          <span className="text-sm font-medium text-gray-500 font-mono">{project.id}</span>
        </div>
      </div>

      {/* Revenue callout */}
      <div className="bg-gradient-to-br from-[#0B3D2E] to-[#1a5c44] rounded-2xl p-8 mb-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-center relative z-10">
          <div>
            <div className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">Estimated Carbon Revenue</div>
            <div className="text-4xl font-extrabold text-[#3FAE5A] tracking-tight">
              ₹{summary.estimatedRevenue?.toLocaleString('en-IN')}
            </div>
            <div className="text-sm text-white/80 mt-2">
              Based on {summary.totalCredits?.toLocaleString('en-IN')} tCO₂e × ₹300/credit
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">Crediting Period</div>
            <div className="text-lg font-bold font-mono text-white">
              {project.crediting_period_start || 'Pending'} — {project.crediting_period_end || 'Pending'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { l: 'Capacity', v: `${project.capacity_mw} MW`, c: 'text-amber-600' },
          { l: 'Verified Generation', v: `${summary.totalMWh.toLocaleString('en-IN')} MWh`, c: 'text-[#0B3D2E]' },
          { l: 'Credits Issued', v: `${summary.totalCredits.toLocaleString('en-IN')} tCO₂e`, c: 'text-[#3FAE5A]' },
        ].map((s, i) => (
          <div key={i} className="stat-card flex flex-col justify-center text-center">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{s.l}</div>
            <div className={`text-2xl font-extrabold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-base font-bold text-gray-900">Project Details</h2>
          </div>
          <div className="space-y-4">
            {[
              ['Developer', project.company_name],
              ['Location', `${project.village}, ${project.district}, ${project.state}`],
              ['Commissioning Date', project.commissioning_date || 'Pending'],
              ['Grid Connection', `${project.discom} (${project.substation || 'Substation pending'})`],
              ['Technology', `${project.module_type || 'Solar PV'}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-500 font-medium">{k}</span>
                <span className="text-gray-900 font-semibold">{v as string}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-[#f9fafb] border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-[#E6F4EA] rounded-full flex items-center justify-center text-2xl mb-4">📤</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Monthly Data</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-[250px]">Upload generation data to mint carbon credits for the previous month.</p>
          <a href="/dashboard/submit" className="btn-primary shadow-lg">Submit Generation Data →</a>
          
          {summary.pendingCount > 0 && (
            <div className="mt-4 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              {summary.pendingCount} submissions pending review
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
