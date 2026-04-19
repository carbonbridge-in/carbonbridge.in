import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.isTempPassword) redirect('/change-password');
  if (session.role === 'ADMIN') redirect('/admin');
  redirect('/dashboard');
}
