'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CartItem } from '@/types';
import Toast from '@/components/ui/Toast';
import styles from './page.module.css';

const PAGE_SIZE = 30;

type OrderEstado = 'pending' | 'paid' | 'cancelled' | 'failed' | 'preparing' | 'ready' | 'shipped' | 'delivered';

interface AdminOrder {
  id: string;
  created_at: string;
  canal: string | null;
  estado: OrderEstado;
  total: number;
  tipo_entrega: 'retiro' | 'envio' | null;
  zona: string | null;
  guest_nombre: string | null;
  guest_email: string | null;
  guest_telefono: string | null;
  guest_direccion: string | null;
  forma_pago: string | null;
  notas: string | null;
  productos: CartItem[];
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  payment_status: string | null;
  payment_verified_at: string | null;
  payment_received: number | null;
  contact_verified: boolean | null;
}

interface OrderEvent {
  id: number;
  event: string;
  source: string | null;
  ip: string | null;
  user_agent: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Sin pago',
  in_process: 'En proceso',
  approved: 'Aprobado ✓',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  charged_back: 'Contracargo',
  cash_pending: 'Paga al recibir',
};

function PaymentStatusPill({ order }: { order: AdminOrder }) {
  const isCash = order.forma_pago === 'efectivo';
  if (isCash) {
    return <span className={styles.payOther}>💵 Efectivo al recibir</span>;
  }
  const status = order.payment_status ?? 'pending';
  const label = PAYMENT_STATUS_LABELS[status] ?? status;
  if (status === 'approved') {
    return <span className={styles.payMP}>{label}</span>;
  }
  return <span style={{ display: 'inline-block', padding: '0.25rem 0.55rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, background: '#fff7ed', color: '#9a3412' }}>{label}</span>;
}

const ESTADO_LABELS: Record<OrderEstado, string> = {
  pending:   'Pendiente',
  paid:      'Pagado',
  preparing: 'Preparando',
  ready:     'Listo p/ retirar',
  shipped:   'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  failed:    'Fallido',
};

const ESTADO_NEXT: Partial<Record<OrderEstado, OrderEstado>> = {
  paid:      'preparing',
  preparing: 'ready',
  ready:     'delivered',
  shipped:   'delivered',
};

function estadoPillClass(e: OrderEstado, s: Record<string, string>): string {
  const map: Record<OrderEstado, string> = {
    pending:   s.pillPending,
    paid:      s.pillPaid,
    preparing: s.pillPreparing,
    ready:     s.pillReady,
    shipped:   s.pillShipped,
    delivered: s.pillDelivered,
    cancelled: s.pillCancelled,
    failed:    s.pillFailed,
  };
  return map[e] ?? '';
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

const METODO_LABELS: Record<string, string> = {
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  account_money: 'Cuenta MP',
  prepaid_card: 'Tarjeta prepaga',
  bank_transfer: 'Transferencia',
  ticket: 'Efectivo',
  atm: 'Cajero',
  mp: 'MercadoPago',
};

function PaymentBadge({ canal, formaPago }: { canal: string | null; formaPago: string | null }) {
  const isMP = canal === 'web' || (formaPago && formaPago !== 'efectivo' && formaPago !== 'local');
  if (isMP) {
    const label = formaPago && METODO_LABELS[formaPago]
      ? METODO_LABELS[formaPago]
      : 'MercadoPago';
    return <span className={styles.payMP}>{label}</span>;
  }
  const label = formaPago
    ? (METODO_LABELS[formaPago] ?? formaPago.charAt(0).toUpperCase() + formaPago.slice(1))
    : 'Local / Efectivo';
  return <span className={styles.payOther}>{label}</span>;
}

function DeliveryBadge({ tipo, zona }: { tipo: 'retiro' | 'envio' | null; zona: string | null }) {
  if (!tipo) return <span className={styles.payOther}>—</span>;
  if (tipo === 'retiro') return <span className={styles.delivRetiro}>🏪 Retiro</span>;
  return <span className={styles.delivEnvio}>🚚 Envío{zona ? ` · ${zona}` : ''}</span>;
}

export default function PedidosAdmin() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Filters
  const [estadoFilter, setEstadoFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [reconciling, setReconciling] = useState(false);

  // Detail modal
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [newEstado, setNewEstado] = useState<OrderEstado>('paid');
  const [saving, setSaving] = useState(false);
  const [confirmOffline, setConfirmOffline] = useState(false);
  const [events, setEvents] = useState<OrderEvent[] | null>(null);

  const flash = (m: string) => setMsg(m);

  const load = useCallback(async (p: number = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(p), canal: 'web' });
    if (estadoFilter) params.set('estado', estadoFilter);
    if (from)         params.set('from', from);
    if (to)           params.set('to', to);
    if (search.trim()) params.set('q', search.trim());
    const r = await fetch(`/api/admin/orders?${params}`);
    if (r.ok) {
      const json = await r.json();
      setOrders(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(p);
    }
    setLoading(false);
  }, [estadoFilter, from, to, search]);

  useEffect(() => { load(1); }, [load]);

  const openDetail = (o: AdminOrder) => {
    setSelected(o);
    setNewEstado(o.estado);
    setConfirmOffline(false);
    setEvents(null);
  };

  // Fetch the private evidence trail whenever the detail modal opens.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    fetch(`/api/admin/orders/${selected.id}/events`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) setEvents(json.data as OrderEvent[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected]);

  const runReconcile = async () => {
    setReconciling(true);
    try {
      const r = await fetch('/api/admin/orders/reconcile', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      const json = await r.json();
      if (r.ok) {
        const paid = (json.results ?? []).filter((x: { result: string }) => x.result === 'paid').length;
        flash(`🔄 Conciliación: ${json.checked ?? 0} pedidos revisados, ${paid} pasaron a pagados`);
        load(page);
      } else {
        flash(`❌ ${json.error ?? 'Error al conciliar'}`);
      }
    } catch {
      flash('❌ Error al conciliar');
    } finally {
      setReconciling(false);
    }
  };

  const handleUpdateEstado = async () => {
    if (!selected) return;
    setSaving(true);
    const r = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        id: selected.id,
        estado: newEstado,
        confirmOfflinePayment: confirmOffline || undefined,
      }),
    });
    const json = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok) {
      flash('✅ Estado actualizado');
      setSelected(null);
      load(page);
    } else {
      flash(`❌ ${json.error ?? 'Error al actualizar'}`);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pedidos</h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>
            {total} pedido{total !== 1 ? 's' : ''} en total
          </p>
        </div>
      </div>

      <Toast message={msg} onDismiss={() => setMsg('')} />

      {/* Filtros */}
      <div className={styles.toolbar}>
        <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className={styles.filterSelect}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagado</option>
          <option value="preparing">Preparando</option>
          <option value="ready">Listo p/ retirar</option>
          <option value="shipped">En camino</option>
          <option value="delivered">Entregado</option>
          <option value="cancelled">Cancelado</option>
          <option value="failed">Fallido</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={styles.dateInput} />
        <span style={{ color: 'var(--gray)', alignSelf: 'center' }}>→</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={styles.dateInput} />
        <button className="btn btn-outline" onClick={() => load(1)}>Filtrar</button>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
          placeholder="Buscar por email, ID pedido o ID pago MP"
          className={styles.dateInput}
          style={{ minWidth: 260 }}
        />
        <button className="btn btn-primary" onClick={runReconcile} disabled={reconciling} title="Verifica pedidos pendientes contra la API de Mercado Pago">
          {reconciling ? 'Conciliando…' : '🔄 Conciliar pagos'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--gray)' }}>Cargando...</p>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th>Entrega</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {new Date(o.created_at).toLocaleString('es-AR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{o.guest_nombre ?? '—'}</div>
                      {o.guest_email && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{o.guest_email}</div>
                      )}
                    </td>
                    <td>
                      <PaymentBadge canal={o.canal} formaPago={o.forma_pago} />
                      <div style={{ marginTop: '0.25rem' }}>
                        <PaymentStatusPill order={o} />
                      </div>
                    </td>
                    <td><DeliveryBadge tipo={o.tipo_entrega} zona={o.zona} /></td>
                    <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                    <td>
                      <span className={`${styles.pill} ${estadoPillClass(o.estado, styles)}`}>
                        {o.estado === 'pending' && o.forma_pago === 'efectivo'
                          ? '💵 Pend. efectivo'
                          : ESTADO_LABELS[o.estado] ?? o.estado}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className={styles.actBtn} onClick={() => openDetail(o)}>
                          Ver
                        </button>
                        {ESTADO_NEXT[o.estado] && (
                          <button
                            className={styles.actBtn}
                            onClick={async () => {
                              const next = ESTADO_NEXT[o.estado]!;
                              const r = await fetch('/api/admin/orders', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                                body: JSON.stringify({ id: o.id, estado: next }),
                              });
                              if (r.ok) { flash(`✅ ${ESTADO_LABELS[next]}`); load(page); }
                              else flash('❌ Error al actualizar');
                            }}
                          >
                            → {ESTADO_LABELS[ESTADO_NEXT[o.estado]!]}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2.5rem' }}>
                      Sin pedidos en el período seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => load(page - 1)}>
                ← Anterior
              </button>
              <span className={styles.pageCurrent}>{page} / {totalPages}</span>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => load(page + 1)}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail/Status modal */}
      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Pedido #{selected.id.slice(0, 8).toUpperCase()}</h2>
              <button className={styles.close} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* Customer info */}
              <div className={styles.infoGrid}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Cliente</span>
                  <span className={styles.infoValue}>{selected.guest_nombre ?? '—'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>
                    {selected.guest_email ?? '—'}
                    {selected.contact_verified === true && (
                      <span style={{ color: 'var(--green-dark)', fontSize: '0.78rem', marginLeft: '0.4rem' }}>✓ verificado</span>
                    )}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Teléfono</span>
                  <span className={styles.infoValue}>{selected.guest_telefono ?? '—'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Forma de pago</span>
                  <span className={styles.infoValue}>
                    <PaymentBadge canal={selected.canal} formaPago={selected.forma_pago} />
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Tipo de entrega</span>
                  <span className={styles.infoValue}>
                    <DeliveryBadge tipo={selected.tipo_entrega} zona={selected.zona} />
                  </span>
                </div>
                {selected.tipo_entrega === 'envio' && selected.guest_direccion && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Dirección</span>
                    <span className={styles.infoValue}>{selected.guest_direccion}</span>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Estado del pago</span>
                  <span className={styles.infoValue}>
                    <PaymentStatusPill order={selected} />
                  </span>
                </div>
                {selected.payment_received != null && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Monto recibido (MP)</span>
                    <span className={styles.infoValue}>{fmt(Number(selected.payment_received))}</span>
                  </div>
                )}
                {selected.mp_payment_id && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>ID Pago MP</span>
                    <span className={styles.infoValue} style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>
                      {selected.mp_payment_id}
                    </span>
                  </div>
                )}
                {selected.mp_preference_id && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>ID Preferencia MP</span>
                    <span className={styles.infoValue} style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>
                      {selected.mp_preference_id}
                    </span>
                  </div>
                )}
                {selected.notas && (
                  <div className={styles.infoRow} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.infoLabel}>Notas</span>
                    <span className={styles.infoValue}>{selected.notas}</span>
                  </div>
                )}
              </div>

              {/* Products */}
              <div>
                <p className={styles.infoLabel} style={{ marginBottom: '0.5rem' }}>Productos</p>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Precio</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.productos ?? []).map((item, i) => (
                      <tr key={i}>
                        <td>{item.nombre}{item.kg ? ` ${item.kg}` : ''}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.precio)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.precio * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>
                  Total: {fmt(selected.total)}
                </div>
              </div>
              {/* Evidence trail (order_events) */}
              <div>
                <p className={styles.infoLabel} style={{ marginBottom: '0.5rem' }}>Historial técnico del pedido</p>
                {events === null ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Cargando eventos…</p>
                ) : events.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                    Sin eventos registrados (pedidos anteriores a la migración).
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 260, overflowY: 'auto', border: '1px solid var(--gray-light)', borderRadius: 'var(--radius-sm)' }}>
                    {events.map((ev) => (
                      <li key={ev.id} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--gray-light)', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <strong>{ev.event}</strong>
                          <span style={{ color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                            {new Date(ev.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--gray)' }}>
                          {ev.source ? `origen: ${ev.source}` : ''}
                          {ev.ip ? ` · IP: ${ev.ip}` : ''}
                        </div>
                        {ev.detail && Object.keys(ev.detail).length > 0 && (
                          <div style={{ color: 'var(--gray)', wordBreak: 'break-all' }}>
                            {JSON.stringify(ev.detail)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <label style={{ fontSize: '0.85rem', color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="checkbox"
                  checked={confirmOffline}
                  onChange={(e) => setConfirmOffline(e.target.checked)}
                />
                Confirmar pago manual (cobrado fuera de la web)
              </label>
              <label style={{ fontSize: '0.875rem', color: 'var(--gray)', marginLeft: '0.25rem' }}>
                Cambiar estado:
              </label>
              <select
                value={newEstado}
                onChange={(e) => setNewEstado(e.target.value as OrderEstado)}
                className={styles.statusSelect}
              >
                {(Object.entries(ESTADO_LABELS) as [OrderEstado, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleUpdateEstado} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
