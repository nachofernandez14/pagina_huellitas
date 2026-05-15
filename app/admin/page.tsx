'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface Stats {
  totalHoy: number;
  totalCajaHoy: number;
  ventasHoyWeb: number;
  ventasHoyLocal: number;
  valorEnStock: number;
  lowStock: { id: string; nombre: string; categoria: string; kg: string; stock: number }[];
  topProducts: { nombre: string; kg: string; unidades_vendidas: number; total_facturado: number }[];
  weekSales: { fecha: string; canal: string; cantidad_ventas: number; total_ventas: number }[];
}

interface PendingOrder {
  id: string;
  created_at: string;
  guest_nombre: string | null;
  guest_telefono: string | null;
  tipo_entrega: 'retiro' | 'envio' | null;
  zona: string | null;
  forma_pago: string | null;
  total: number;
  estado: string;
  canal: string | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function SalesChart({ data }: { data: Stats['weekSales'] }) {
  // Build days array always (up to 7 past days)
  const today = new Date();
  const allDays: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const byDate: Record<string, { web: number; local: number }> = {};
  allDays.forEach((d) => { byDate[d] = { web: 0, local: 0 }; });
  data.forEach((d) => {
    if (!byDate[d.fecha]) byDate[d.fecha] = { web: 0, local: 0 };
    if (d.canal === 'local' || d.canal === 'caja') byDate[d.fecha].local += Number(d.total_ventas);
    else if (d.canal === 'web') byDate[d.fecha].web += Number(d.total_ventas);
  });

  const days = allDays.map((f) => ({ fecha: f, ...byDate[f] }));
  const max = Math.max(...days.map((v) => v.web + v.local), 1);
  const hasData = days.some((d) => d.web + d.local > 0);

  if (!hasData) {
    return (
      <div className={styles.emptyChart}>
        <div className={styles.emptyBars}>
          {[30, 50, 20, 70, 40, 60, 35].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
        <p className={styles.emptyMsg}>Sin ventas registradas esta semana</p>
      </div>
    );
  }

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLegend}>
        <span className={styles.legendWeb}>Web</span>
        <span className={styles.legendLocal}>Local</span>
      </div>
      <div className={styles.chart}>
        {days.map(({ fecha, web, local }) => {
          const total = web + local;
          const pct = total > 0 ? Math.max(Math.round((total / max) * 100), 5) : 0;
          const webPct = total > 0 ? (web / total) * 100 : 0;
          const label = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
          return (
            <div key={fecha} className={styles.chartBar}>
              {total > 0 && <span className={styles.chartValue}>{fmt(total)}</span>}
              <div className={styles.barTrack}>
                {pct > 0 && (
                  <div className={styles.barFill} style={{ height: `${pct}%` }}>
                    {web > 0 && local > 0 && (
                      <div className={styles.barWeb} style={{ height: `${webPct}%` }} />
                    )}
                  </div>
                )}
              </div>
              <span className={styles.chartLabel}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopProductsChart({ data }: { data: Stats['topProducts'] }) {
  if (!data.length) {
    return (
      <div className={styles.emptyChart}>
        <div className={styles.emptyBars}>
          {[100, 75, 60, 45, 30].map((w, i) => (
            <span key={i} style={{ width: `${w}%`, height: '8px', borderRadius: '999px', display: 'block', margin: '6px 0' }} />
          ))}
        </div>
        <p className={styles.emptyMsg}>Sin ventas registradas</p>
      </div>
    );
  }
  const max = Math.max(...data.map((p) => Number(p.unidades_vendidas)), 1);
  return (
    <div className={styles.horizChart}>
      {data.slice(0, 6).map((p, i) => {
        const pct = Math.round((Number(p.unidades_vendidas) / max) * 100);
        const name = `${p.nombre}${p.kg ? ` ${p.kg}` : ''}`;
        return (
          <div key={i} className={styles.horizRow}>
            <div className={styles.horizTop}>
              <span className={styles.horizLabel} title={name}>{name}</span>
              <span className={styles.horizVal}>{p.unidades_vendidas} u.</span>
            </div>
            <div className={styles.horizTrack}>
              <div className={styles.horizFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => r.json()),
      fetch('/api/admin/orders?estado=paid&canal=web&limit=10').then((r) => r.json()),
    ]).then(([statsData, ordersData]) => {
      setStats(statsData);
      setPending(ordersData.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>{today}</p>
        </div>
      </div>

      {loading ? (
        <>
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
            ))}
          </div>
          <div className={styles.skeletonRow}>
            <div className={`${styles.skeleton} ${styles.skeletonPanel}`} />
            <div className={`${styles.skeleton} ${styles.skeletonPanel}`} />
          </div>
        </>
      ) : (
        <>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiGreen}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiValue}>{fmt(stats?.totalHoy ?? 0)}</div>
                <div className={styles.kpiLabel}>
                  Ventas hoy
                  {(stats?.totalCajaHoy ?? 0) > 0 && (
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--gray)', fontWeight: 400, marginTop: '2px' }}>
                      incl. {fmt(stats!.totalCajaHoy)} de caja
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiBlue}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiValue}>{stats?.ventasHoyWeb ?? 0}</div>
                <div className={styles.kpiLabel}>Pedidos web hoy</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiOrange}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiValue}>{stats?.ventasHoyLocal ?? 0}</div>
                <div className={styles.kpiLabel}>Ventas local hoy</div>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiPurple}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiValue}>{fmt(stats?.valorEnStock ?? 0)}</div>
                <div className={styles.kpiLabel}>Valor en stock</div>
              </div>
            </div>

            <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
              <div className={`${styles.kpiIcon} ${styles.kpiRed}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiValue}>{stats?.lowStock.length ?? 0}</div>
                <div className={styles.kpiLabel}>Stock bajo</div>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className={styles.row}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.panelTitle}>Ventas ultimos 7 dias</h2>
              <SalesChart data={stats?.weekSales ?? []} />
            </div>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.panelTitle}>Top productos vendidos</h2>
              <TopProductsChart data={stats?.topProducts ?? []} />
            </div>
          </div>

          {/* Low stock alert */}
          {(stats?.lowStock ?? []).length > 0 && (
            <div className={`card ${styles.panel}`} style={{ marginTop: '1.5rem' }}>
              <h2 className={styles.panelTitle}>Alerta de stock bajo</h2>
              <table className={styles.miniTable}>
                <thead>
                  <tr><th>Producto</th><th>Categoria</th><th>Kg</th><th>Stock</th></tr>
                </thead>
                <tbody>
                  {stats?.lowStock.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td><span className="badge">{p.categoria}</span></td>
                      <td>{p.kg ?? '—'}</td>
                      <td>
                        <span style={{ color: p.stock === 0 ? 'var(--error)' : 'var(--accent)', fontWeight: 700 }}>
                          {p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pending web orders */}
          <div className={`card ${styles.panel}`} style={{ marginTop: '1.5rem' }}>
            <div className={styles.pendingHeader}>
              <h2 className={styles.panelTitle} style={{ marginBottom: 0 }}>Pedidos web recientes</h2>
              <Link href="/admin/pedidos" className={styles.viewAll}>Ver todos →</Link>
            </div>
            {pending.length === 0 ? (
              <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginTop: '1rem' }}>
                Sin pedidos pagados pendientes de procesar.
              </p>
            ) : (
              <table className={styles.miniTable} style={{ marginTop: '0.75rem' }}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Entrega</th>
                    <th>Zona / Dir.</th>
                    <th>Pago</th>
                    <th>Total</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 500 }}>{o.guest_nombre ?? '—'}</td>
                      <td>
                        {o.tipo_entrega === 'retiro'
                          ? <span className={styles.tagRetiro}>🏪 Retiro</span>
                          : o.tipo_entrega === 'envio'
                            ? <span className={styles.tagEnvio}>🚚 Envío</span>
                            : <span style={{ color: 'var(--gray)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{o.zona ?? '—'}</td>
                      <td>
                        <span className={styles.tagMP}>MP</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                        {new Date(o.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
