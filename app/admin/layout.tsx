import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { requireAdmin } from '@/lib/auth';
import styles from './layout.module.css';

export const metadata = { title: 'Panel Admin — Huellitas' };

async function AdminAuthGate({ children }: { children: React.ReactNode }) {
  // Server-side auth: this layout must never render for unauthenticated
  // visitors, even if middleware is bypassed (e.g. RSC prefetch requests).
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  return (
    <div className={styles.shell}>
      <Suspense fallback={null}>
        <AdminSidebar />
      </Suspense>
      <div className={styles.content}>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}

// The auth check reads cookies (request-time data), so it must run inside a
// <Suspense> boundary as required by Cache Components. This leaves no static
// shell or cached RSC payload for these routes.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminAuthGate>{children}</AdminAuthGate>
    </Suspense>
  );
}