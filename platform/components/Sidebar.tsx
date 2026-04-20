'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

type NavLink = { href: string; icon: string; label: string; badge?: string };

const adminLinks: NavLink[] = [
  { href: '/admin',             icon: '📊', label: 'Overview' },
  { href: '/admin/projects',    icon: '☀️', label: 'Projects' },
  { href: '/admin/submissions', icon: '📋', label: 'Submissions', badge: 'pending' },
  { href: '/admin/users',       icon: '👤', label: 'Users' },
  { href: '/admin/audit',       icon: '🔍', label: 'Audit Logs' },
  { href: '/admin/export',      icon: '📥', label: 'Export Data' },
];

const clientLinks: NavLink[] = [
  { href: '/dashboard',            icon: '🏠', label: 'My Project' },
  { href: '/dashboard/generation', icon: '⚡', label: 'Generation Data' },
  { href: '/dashboard/submit',     icon: '📤', label: 'Submit Data' },
  { href: '/dashboard/revenue',    icon: '💰', label: 'Carbon Revenue' },
  { href: '/dashboard/documents',  icon: '📎', label: 'Documents' },
];

interface SidebarProps {
  role: 'ADMIN' | 'CLIENT';
  name: string;
  email: string;
}

export default function Sidebar({ role, name, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const links = role === 'ADMIN' ? adminLinks : clientLinks;

  useEffect(() => {
    if (role === 'ADMIN') {
      fetch('/api/admin/submissions?status=pending')
        .then(r => r.json())
        .then(d => setPendingCount(d.submissions?.length || 0))
        .catch(() => {});
    }
  }, [role]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0 shrink-0">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/assets/logo.jpg" alt="CarbonBridge Logo" width={40} height={40} className="object-contain" priority />
          </div>
          <div>
            <div className="font-bold text-[#0B3D2E] text-[15px] tracking-tight">CarbonBridge</div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">MRV Platform</div>
          </div>
        </div>

        {/* Role badge */}
        <div className="mt-3">
          <span className={`badge ${role === 'ADMIN' ? 'badge-admin' : 'badge-client'}`}>
            {role === 'ADMIN' ? '⚙ Admin' : '☀ Client'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(link => {
          const isActive = link.href === '/admin'
            ? pathname === '/admin'
            : link.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-base">{link.icon}</span>
              <span className="flex-1">{link.label}</span>
              {link.badge === 'pending' && pendingCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Verra tag */}
      <div className="px-4 py-3 mx-3 mb-3 bg-[#E6F4EA] rounded-xl text-[10px] text-[#0B3D2E] font-semibold">
        🟢 Verra VCS · Gold Standard<br />
        <span className="font-normal text-gray-500">AMS-I.D · CEA 0.82 tCO₂/MWh</span>
      </div>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        <div className="text-[13px] font-semibold text-gray-800 truncate">{name}</div>
        <div className="text-[11px] text-gray-400 truncate mb-2">{email}</div>
        <button onClick={logout} className="btn-secondary w-full justify-center text-xs py-2">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
