'use client';
import { useState, useEffect } from 'react';

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CLIENT');
  const [assignedProjectId, setAssignedProjectId] = useState('');

  const [createdInfo, setCreatedInfo] = useState<{name:string; email:string; tempPassword:string}|null>(null);

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users || []));
    fetch('/api/admin/projects').then(r => r.json()).then(d => {
      setProjects(d.projects || []);
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, assignedProjectId: assignedProjectId || null }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers([data.user, ...users]);
      setCreatedInfo({ name, email, tempPassword: data.tempPassword });
      setShowModal(false);
      setName(''); setEmail(''); setAssignedProjectId('');
    } else {
      alert(data.error);
    }
  }

  async function resetPassword(id: string) {
    if (!confirm('Reset password? This will invalidate their current password and generate a new temporary one.')) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password' })
    });
    const data = await res.json();
    if (res.ok) {
      setUsers(users.map(u => u.id === id ? { ...u, is_temp_password: true } : u));
      setCreatedInfo({ name: 'User', email: '...', tempPassword: data.tempPassword });
    }
  }

  if (loading) return <div className="p-8"><div className="skeleton h-32 w-full mb-4"></div></div>;

  return (
    <div className="animate-fadeUp">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">User Management</h1>
          <p className="text-gray-500 font-medium mt-1">Platform access control and client provisioning</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <span className="text-lg leading-none">+</span> Create User
        </button>
      </div>

      {createdInfo && (
        <div className="alert alert-success mb-6 p-4">
          <div>
            <div className="font-bold text-gray-900 text-base mb-1">User provisioned successfully</div>
            <div className="text-gray-600 mb-2">Send these credentials to the user securely. They will be forced to change the password on first login.</div>
            <div className="bg-white border text-sm font-mono p-3 rounded mt-2">
              Email: <b>{createdInfo.email}</b><br/>
              Temp Password: <b>{createdInfo.tempPassword}</b>
            </div>
            <button className="text-xs font-bold mt-2 text-[#3FAE5A]" onClick={() => setCreatedInfo(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name / Email</th><th>Role</th><th>Assigned Project</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                  <td>
                    <div className="font-semibold text-gray-900">{u.name}</div>
                    <div className="text-[12px] text-gray-500 font-mono mt-0.5">{u.email}</div>
                  </td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-client'}`}>{u.role}</span></td>
                  <td>
                    {u.assigned_project_id ? (
                      <span className="text-sm font-medium text-[#3FAE5A]">
                        {projects.find(p => p.id === u.assigned_project_id)?.project_name || 'Unknown Project'}
                      </span>
                    ) : <span className="text-xs text-gray-400">— All Access —</span>}
                  </td>
                  <td>
                    {u.is_temp_password 
                      ? <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Pending Setup</span>
                      : <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Active</span>}
                  </td>
                  <td>
                    <button onClick={() => resetPassword(u.id)} className="btn-secondary text-xs px-2 py-1">Reset PW</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New User</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">Full Name</label>
                <input required className="input" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">Email (Login ID)</label>
                <input required type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">Role</label>
                <select className="input" value={role} onChange={e => { setRole(e.target.value); if(e.target.value==='ADMIN') setAssignedProjectId(''); }}>
                  <option value="CLIENT">Client</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              {role === 'CLIENT' && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">Assign Project</label>
                  <select required className="input" value={assignedProjectId} onChange={e => setAssignedProjectId(e.target.value)}>
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_name} ({p.company_name})</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 justify-end mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary font-semibold">Cancel</button>
                <button type="submit" className="btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
