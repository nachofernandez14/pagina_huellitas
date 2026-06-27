import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Order } from '@/types';
import ProfileForm from './ProfileForm';
import SignOutButton from './SignOutButton';
import styles from './page.module.css';

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_LABEL: Record<string, { label: string; color: 'green' | 'orange' | 'gray' | 'red' }> = {
  pending:    { label: 'Pendiente',   color: 'orange' },
  paid:       { label: 'Pagado',      color: 'green'  },
  preparing:  { label: 'Preparando',  color: 'orange' },
  ready:      { label: 'Listo',       color: 'green'  },
  shipped:    { label: 'En camino',   color: 'orange' },
  delivered:  { label: 'Entregado',   color: 'green'  },
  cancelled:  { label: 'Cancelado',   color: 'red'    },
  failed:     { label: 'Fallido',     color: 'red'    },
};

const ENTREGA_LABEL: Record<string, string> = {
  retiro: 'Retiro en local',
  envio:  'Envío a domicilio',
};

export default function PerfilPage() {
  return (
    <Suspense fallback={null}>
      <PerfilContent />
    </Suspense>
  );
}

async function PerfilContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .neq('estado', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(30);

  const initial = (profile?.nombre ?? user.email ?? '?').charAt(0).toUpperCase();

  return (
    <div className={`section ${styles.page}`}>
      <div className={`container ${styles.container}`}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className={styles.hero}>
          <div className={styles.avatar}>{initial}</div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroName}>{profile?.nombre ?? 'Sin nombre'}</h1>
            <p className={styles.heroEmail}>{user.email}</p>
          </div>
          <SignOutButton />
        </div>

        {/* Admin access */}
        {profile?.rol === 'admin' && (
          <Link href="/admin" className={`btn btn-primary ${styles.adminBtn}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Panel de administración
          </Link>
        )}

        {/* ── Two-column grid ──────────────────────────────────── */}
        <div className={styles.grid}>

          {/* ── Left: Mis datos ─────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              Mis datos
            </h2>
            <div className={`card ${styles.card}`}>
              <ProfileForm
                initialNombre={profile?.nombre ?? ''}
                initialTelefono={profile?.telefono ?? ''}
                initialDireccion={profile?.direccion ?? ''}
                initialZona={profile?.zona ?? ''}
              />
            </div>
          </section>

          {/* ── Right: Mis pedidos ──────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="16" x2="13" y2="16"/>
              </svg>
              Mis pedidos
            </h2>

            {(!orders || orders.length === 0) ? (
              <div className={`card ${styles.card} ${styles.emptyOrders}`}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-light)' }}>
                  <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4Z"/>
                  <path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                <p className={styles.emptyText}>Todavía no tenés pedidos</p>
                <Link href="/productos" className="btn btn-primary">Ver productos</Link>
              </div>
            ) : (
              <div className={styles.ordersList}>
                {(orders as Order[]).map((order) => {
                  const st = STATUS_LABEL[order.estado] ?? { label: order.estado, color: 'gray' };
                  return (
                    <div key={order.id} className={`card ${styles.orderCard}`}>
                      {/* Order header row */}
                      <div className={styles.orderHead}>
                        <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
                        <span className={`${styles.badge} ${styles[`badge${st.color.charAt(0).toUpperCase() + st.color.slice(1)}`]}`}>
                          {st.label}
                        </span>
                        <span className={styles.orderTotal}>{formatPrice(order.total)}</span>
                      </div>

                      {/* Meta row */}
                      <div className={styles.orderMeta}>
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                          </svg>
                          {new Date(order.created_at).toLocaleDateString('es-AR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </span>
                        {order.tipo_entrega && (
                          <span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                            </svg>
                            {ENTREGA_LABEL[order.tipo_entrega] ?? order.tipo_entrega}
                          </span>
                        )}
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4Z"/><path d="M3 6h18"/>
                          </svg>
                          {order.productos.length} producto{order.productos.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Products mini-list */}
                      <ul className={styles.productList}>
                        {order.productos.slice(0, 3).map((p, i) => (
                          <li key={i} className={styles.productItem}>
                            <span className={styles.productName}>{p.nombre}</span>
                            {p.kg && <span className={styles.productKg}>{p.kg}</span>}
                            <span className={styles.productQty}>×{p.quantity}</span>
                          </li>
                        ))}
                        {order.productos.length > 3 && (
                          <li className={styles.productMore}>+{order.productos.length - 3} más</li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
