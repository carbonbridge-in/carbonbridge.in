'use client';
import { useState, useEffect } from 'react';

export default function AdminProjectsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick form for new project
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ project_name: '', company_name: '', capacity_mw: '', state: '', district: '', village: '' });

  useEffect(() => {
    fetch('/api/admin/projects')
      .then(r => r.json())
      .then(d => { setData(d.projects || []); setLoading(false); });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, capacity_mw: parseFloat(form.capacity_mw) }),
    });
    const d = await res.json();
    if (res.ok) {
      setData([d.project, ...data]);
      setShowModal(false);
      setForm({ project_name: '', company_name: '', capacity_mw: '', state: '', district: '', village: '' });
    } else {
      alert(d.error);
    }
  }

  if (loading) return <div className="p-8"><div className="skeleton h-64 w-full"></div></div>;

  return (
    <div className="animate-fadeUp">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">Project Registry</h1>
          <p className="text-gray-500 font-medium mt-1">Solar plants enrolled for carbon crediting</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <span className="text-lg leading-none">+</span> Add Project
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Project Name & Client</th><th>Location</th><th>MW</th><th>Status</th><th>Added On</th></tr>
            </thead>
            <tbody>
              {data.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="font-bold text-gray-900">{p.project_name}</div>
                    <div className="text-[12px] text-gray-500 mt-1">{p.company_name}</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-800">{p.state}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{p.district}, {p.village}</div>
                  </td>
                  <td className="font-semibold text-amber-600">{p.capacity_mw} MW</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  <td className="text-[12px] text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">No projects registered yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Register New Solar Plant</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">Project Name (e.g. Bhadla Phase 2)</label>
                <input required className="input" value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">Company Name</label>
                  <input required className="input" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">Capacity (MW AC)</label>
                  <input required type="number" step="0.01" className="input" value={form.capacity_mw} onChange={e => setForm({...form, capacity_mw: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">State</label>
                  <input required className="input" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">District</label>
                  <input required className="input" value={form.district} onChange={e => setForm({...form, district: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">Village</label>
                  <input required className="input" value={form.village} onChange={e => setForm({...form, village: e.target.value})} />
                </div>
              </div>
              <hr className="my-4 border-gray-100" />
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary font-semibold">Cancel</button>
                <button type="submit" className="btn-primary">Register Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
