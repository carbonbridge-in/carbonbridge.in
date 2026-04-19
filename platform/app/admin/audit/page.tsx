'use client';
import { useState, useEffect } from 'react';

export default function AdminAuditLogsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then(r => r.json())
      .then(d => {
        setData(d.logs || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8"><div className="skeleton h-64 w-full"></div></div>;

  return (
    <div className="animate-fadeUp">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0B3D2E] tracking-tight">Audit Trail</h1>
        <p className="text-gray-500 font-medium mt-1">Immutable cryptographic log of all platform actions</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor (Email)</th>
                <th>Target Entity</th>
                <th>Diff / Details</th>
              </tr>
            </thead>
            <tbody>
              {data.map(l => (
                <tr key={l.id}>
                  <td className="text-[12px] text-gray-500 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td>
                    <span className="font-semibold text-[12px] uppercase tracking-wider text-gray-800 bg-gray-100 px-2 py-1 rounded">
                      {l.action}
                    </span>
                  </td>
                  <td className="font-mono text-[12px] text-gray-600">{l.user_email || 'System'}</td>
                  <td className="text-[12px] text-gray-500">{l.entity_type || '—'} {l.entity_id ? `(${l.entity_id.substring(0,8)})` : ''}</td>
                  <td className="text-[11px] font-mono text-gray-500 max-w-[200px] truncate">
                    {l.new_value ? JSON.stringify(l.new_value) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
