'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (pw !== confirm) { setError('Passwords do not match'); return; }
    if (pw.length < 8) { setError('Minimum 8 characters required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push('/');
    } catch {
      setError('Error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E6F4EA] to-white px-4">
      <div className="w-full max-w-md animate-fadeUp">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-[#0B3D2E] flex items-center justify-center text-xl">🌿</div>
          <div className="font-bold text-2xl text-[#0B3D2E] tracking-tight">CarbonBridge</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mb-4">🔐</div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Set Your Password</h1>
          <p className="text-sm text-gray-500 mb-6">You are using a temporary password. Please set a new secure password to continue.</p>

          {error && <div className="alert alert-error mb-5"><span>⚠</span> {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" className="input" placeholder="Minimum 8 characters" value={pw} onChange={e => setPw(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" className="input" placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" /> Saving...</> : 'Set Password & Continue →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
