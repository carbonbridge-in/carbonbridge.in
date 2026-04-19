import { getSession } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="ADMIN" name={session.name} email={session.email} />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
