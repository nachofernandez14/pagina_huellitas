import { Suspense } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from './layout.module.css';

export const metadata = { title: 'Panel Admin — Huellitas' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
