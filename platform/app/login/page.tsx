'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      router.push(data.redirectTo || '/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E6F4EA] to-white px-4">
      <div className="w-full max-w-md animate-fadeUp">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-[#0B3D2E] flex items-center justify-center text-xl">🌿</div>
          <div>
            <div className="font-bold text-2xl text-[#0B3D2E] tracking-tight">CarbonBridge</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-widest">MRV Platform · Verra / Gold Standard</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Sign In</h1>
          <p className="text-sm text-gray-500 mb-6">Admin-provisioned accounts only. No public signup.</p>

          {error && (
            <div className="alert alert-error mb-5">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                id="login-email"
                type="email"
                required
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="login-password"
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" /> Authenticating...</>
              ) : 'Sign In →'}
            </button>
          </form>

          <hr className="my-6 border-gray-100" />
          <div className="text-xs text-gray-400 text-center leading-6">
            Secured with JWT · bcrypt · Rate Limited<br />
            <span className="text-[#3FAE5A] font-medium">🔒 Verra-compliant audit trail active</span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 CarbonBridge · All rights reserved
        </p>
      </div>
    </div>
  );
}
