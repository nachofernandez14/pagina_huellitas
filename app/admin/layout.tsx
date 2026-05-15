import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from './layout.module.css';

export const metadata = { title: 'Panel Admin — Huellitas' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
