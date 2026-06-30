'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import styles from './page.module.css';

interface CajaEntry {
  id: string;
  fecha: string;
  saldo_inicial: number;
  ventas_efectivo: number;
  ventas_mercadopago: number;
  ventas_tarjeta: number;
  ventas_transferencia: number;
  ventas_locales_efectivo?: number;
  ventas_locales_transferencia?: number;
  ventas_locales_tarjeta?: number;
  ventas_locales_otro?: number;
  notas: string | null;
}

interface VentaDetalle {
  id: string;
  forma_pago: string;
  total: number;
  productos: Record<string, unknown>[];
  guest_nombre: string | null;
  created_at: string;
}

function safeStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return fallback;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || fallback;
  return fallback;
}

interface VentasHoy {
  [formaPago: string]: number;
}

const EMPTY_FORM = {
  fecha: todayLocal(),
  saldo_inicial: '',
  ventas_efectivo: '',
  ventas_tarjeta: '',
  ventas_transferencia: '',
  notas: '',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function totalVentasCaja(e: CajaEntry) {
  const locales =
    (e.ventas_locales_efectivo ?? 0) +
    (e.ventas_locales_transferencia ?? 0) +
    (e.ventas_locales_tarjeta ?? 0);
  const pendiente = e.ventas_efectivo + e.ventas_tarjeta + e.ventas_transferencia;
  return pendiente + locales;
}

function localesPorTipo(e: CajaEntry) {
  return {
    efectivo: e.ventas_locales_efectivo ?? 0,
    transferencia: e.ventas_locales_transferencia ?? 0,
    tarjeta: e.ventas_locales_tarjeta ?? 0,
    otro: e.ventas_locales_otro ?? 0,
  };
}

function pendientePorTipo(e: CajaEntry) {
  return {
    efectivo: e.ventas_efectivo,
    transferencia: e.ventas_transferencia + e.ventas_mercadopago,
    tarjeta: e.ventas_tarjeta,
  };
}

export default function CajaPage() {
  const [entries, setEntries] = useState<CajaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [ventasHoy, setVentasHoy] = useState<VentasHoy>({});
  const [detalleVentas, setDetalleVentas] = useState<VentaDetalle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const downTarget = useRef<EventTarget | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const fetchVentas = useCallback(async (fecha: string) => {
    const r = await fetch(`/api/admin/caja?ventas=true&fecha=${fecha}`);
    if (r.ok) {
      const json = await r.json();
      setVentasHoy(json.ventasHoy ?? {});
      setDetalleVentas(json.detalleVentas ?? []);
      if (json.entries) setEntries(json.entries);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const localDate = todayLocal();
    const r = await fetch(`/api/admin/caja?ventas=true&fecha=${localDate}`);
    if (r.ok) {
      const json = await r.json();
      if (json.entries) {
        setEntries(json.entries);
        setVentasHoy(json.ventasHoy ?? {});
        setDetalleVentas(json.detalleVentas ?? []);
      } else {
        setEntries(json);
        setVentasHoy({});
        setDetalleVentas([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (modal && form.fecha) {
      fetchVentas(form.fecha);
    }
  }, [modal, form.fecha, fetchVentas]);

  const setField = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // Bolsas registradas (ventas locales actuales para la fecha del modal)
  const bolsas = {
    efectivo: ventasHoy['efectivo'] ?? 0,
    transferencia: (ventasHoy['mp'] ?? 0) + (ventasHoy['mercadopago'] ?? 0) + (ventasHoy['transferencia'] ?? 0),
    tarjeta: ventasHoy['tarjeta'] ?? 0,
    otro: ventasHoy['otro'] ?? 0,
  };
  const totalBolsas = bolsas.efectivo + bolsas.transferencia + bolsas.tarjeta + bolsas.otro;

  // Total contado (lo que ingresa el admin)
  const totalContado = {
    efectivo: parseFloat(form.ventas_efectivo) || 0,
    transferencia: parseFloat(form.ventas_transferencia) || 0,
    tarjeta: parseFloat(form.ventas_tarjeta) || 0,
  };
  const sumaContado = totalContado.efectivo + totalContado.transferencia + totalContado.tarjeta;

  // Monto pendiente = total contado - bolsas registradas
  const pendiente = {
    efectivo: Math.max(0, totalContado.efectivo - bolsas.efectivo),
    transferencia: Math.max(0, totalContado.transferencia - bolsas.transferencia),
    tarjeta: Math.max(0, totalContado.tarjeta - bolsas.tarjeta),
  };
  const totalPendiente = pendiente.efectivo + pendiente.transferencia + pendiente.tarjeta;

  const handleSave = async () => {
    setSaving(true);
    const r = await fetch('/api/admin/caja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        fecha: form.fecha,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
        ventas_efectivo: totalContado.efectivo,
        ventas_mercadopago: 0,
        ventas_tarjeta: totalContado.tarjeta,
        ventas_transferencia: totalContado.transferencia,
        notas: form.notas || null,
      }),
    });
    setSaving(false);
    if (r.ok) {
      flash(editingId ? '✅ Caja actualizada' : '✅ Caja guardada');
      setModal(false);
      setEditingId(null);
      load();
    } else {
      const e = await r.json();
      flash(`❌ ${e.error}`);
    }
  };

  // KPIs del mes actual
  const today = todayLocal();
  const thisMonth = today.slice(0, 7);
  const monthEntries = entries.filter((e) => e.fecha.startsWith(thisMonth));
  const totalMes = monthEntries.reduce((s, e) => s + totalVentasCaja(e), 0);
  const totalEfectivoMes = monthEntries.reduce((s, e) => s + e.ventas_efectivo + (e.ventas_locales_efectivo ?? 0), 0);
  const totalTransfMes = monthEntries.reduce((s, e) => s + e.ventas_transferencia + e.ventas_mercadopago + (e.ventas_locales_transferencia ?? 0), 0);

  const openNew = async () => {
    setEditingId(null);
    const localDate = todayLocal();
    await fetchVentas(localDate);
    const existing = entries.find((e) => e.fecha === localDate);
    if (existing) {
      const ptes = pendientePorTipo(existing);
      const loc = localesPorTipo(existing);
      const transfTotal = ptes.transferencia + loc.transferencia;
      setForm({
        fecha: existing.fecha,
        saldo_inicial: String(existing.saldo_inicial),
        ventas_efectivo: String(ptes.efectivo + loc.efectivo),
        ventas_tarjeta: String(ptes.tarjeta + loc.tarjeta),
        ventas_transferencia: String(transfTotal),
        notas: existing.notas ?? ''
      });
    } else {
      setForm({ ...EMPTY_FORM, fecha: localDate });
    }
    setModal(true);
  };

  const openForDate = async (fecha: string) => {
    setEditingId(null);
    await fetchVentas(fecha);
    const existing = entries.find((e) => e.fecha === fecha);
    if (existing) {
      const ptes = pendientePorTipo(existing);
      const loc = localesPorTipo(existing);
      const transfTotal = ptes.transferencia + loc.transferencia;
      setForm({
        fecha: existing.fecha,
        saldo_inicial: String(existing.saldo_inicial),
        ventas_efectivo: String(ptes.efectivo + loc.efectivo),
        ventas_tarjeta: String(ptes.tarjeta + loc.tarjeta),
        ventas_transferencia: String(transfTotal),
        notas: existing.notas ?? ''
      });
    } else {
      setForm({ ...EMPTY_FORM, fecha });
    }
    setModal(true);
  };

  const openEdit = async (entry: CajaEntry) => {
    setEditingId(entry.id);
    await fetchVentas(entry.fecha);
    const loc = localesPorTipo(entry);
    const ptes = pendientePorTipo(entry);
    const transfTotal = ptes.transferencia + loc.transferencia;
    setForm({
      fecha: entry.fecha,
      saldo_inicial: String(entry.saldo_inicial),
      ventas_efectivo: String(ptes.efectivo + loc.efectivo),
      ventas_tarjeta: String(ptes.tarjeta + loc.tarjeta),
      ventas_transferencia: String(transfTotal),
      notas: entry.notas ?? ''
    });
    setModal(true);
  };

  const detallesPorPago = {
    efectivo: detalleVentas.filter((v) => v.forma_pago === 'efectivo'),
    transferencia: detalleVentas.filter((v) => ['mp', 'mercadopago', 'transferencia'].includes(v.forma_pago ?? '')),
    tarjeta: detalleVentas.filter((v) => v.forma_pago === 'tarjeta'),
    otro: detalleVentas.filter((v) => v.forma_pago === 'otro'),
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Caja diaria</h1>
          <p className={styles.subtitle}>Registrá el movimiento de caja al cierre de cada jornada</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => openForDate(yesterdayLocal())}>
            Cierre de ayer
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            + Registrar cierre de caja
          </button>
        </div>
      </div>

      {msg && <div className={styles.toast}>{msg}</div>}

      {/* KPI strip */}
      <div className={styles.kpiStrip}>
        <div className={`${styles.kpi} ${styles.kpiGreen}`}>
          <span>Total recaudado del mes</span>
          <strong>{fmt(totalMes)}</strong>
        </div>
        <div className={styles.kpi}>
          <span>Efectivo (mes)</span>
          <strong>{fmt(totalEfectivoMes)}</strong>
        </div>
        <div className={styles.kpi}>
          <span>Transferencias (mes)</span>
          <strong>{fmt(totalTransfMes)}</strong>
        </div>
        <div className={styles.kpi}>
          <span>Días registrados (mes)</span>
          <strong>{monthEntries.length}</strong>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray">Cargando...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Saldo inicial</th>
                <th>Ventas locales</th>
                <th>Efectivo</th>
                <th>Transferencias</th>
                <th>Tarjeta</th>
                <th>Total recaudado</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const loc = localesPorTipo(e);
                const ptes = pendientePorTipo(e);
                return (
                  <tr key={e.id} className={e.fecha === today ? styles.todayRow : ''}>
                    <td className={styles.fechaCell}>
                      {new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                    </td>
                    <td>{fmt(e.saldo_inicial)}</td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {fmt(loc.efectivo + loc.transferencia + loc.tarjeta + loc.otro)}
                    </td>
                    <td>{fmt(ptes.efectivo)}</td>
                    <td>{fmt(ptes.transferencia)}</td>
                    <td>{fmt(ptes.tarjeta)}</td>
                    <td className={styles.totalCell}>{fmt(totalVentasCaja(e))}</td>
                    <td className={styles.notasCell}>{e.notas ?? '—'}</td>
                    <td>
                      <button className={styles.editBtn} onClick={() => openEdit(e)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>
                    Aún no hay registros. Usá el botón de arriba para registrar el primer cierre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          className={styles.overlay}
          onMouseDown={(e) => { downTarget.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && downTarget.current === e.currentTarget) setModal(false);
            downTarget.current = null;
          }}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingId ? 'Editar cierre de caja' : 'Cierre de caja'}</h2>
              <button className={styles.close} onClick={() => { setModal(false); setEditingId(null); }}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" value={form.fecha} onChange={(e) => setField('fecha', e.target.value)} />
              </div>

              {/* Bolsas vendidas (ventas locales registradas) */}
              <div className={styles.sectionBox}>
                <h3 className={styles.sectionTitle}>Ventas locales registradas</h3>
                <p className={styles.sectionDesc}>
                  {editingId
                    ? 'Ventas locales actuales para esta fecha. Se restan automáticamente del total que ingreses abajo.'
                    : 'Estas ventas ya están cargadas y se restan automáticamente del total que ingreses abajo.'}
                </p>

                {(['efectivo', 'transferencia', 'tarjeta', 'otro'] as const).map((tipo) => {
                  const detalles = detallesPorPago[tipo];
                  if (!detalles.length && bolsas[tipo] === 0) return null;
                  return (
                    <div key={tipo} className={styles.detalleGrupo}>
                      <div className={styles.detalleHeader}>
                        <span className={styles.detalleLabel}>
                          {tipo === 'transferencia' ? 'Transferencias / MP' : tipo === 'efectivo' ? 'Efectivo' : tipo === 'tarjeta' ? 'Tarjeta' : 'QR / Otro'}
                        </span>
                        <span className={styles.detalleTotal}>{fmt(bolsas[tipo])}</span>
                      </div>
                      {detalles.length > 0 && (
                        <div className={styles.detalleItems}>
                          {detalles.map((v) => (
                            <div key={v.id} className={styles.detalleVenta}>
                              <div className={styles.detalleVentaHead}>
                                <span className={styles.detalleCliente}>{v.guest_nombre ?? 'Venta local'}</span>
                                <span className={styles.detalleHora}>
                                  {new Date(v.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={styles.detalleMonto}>{fmt(v.total)}</span>
                              </div>
                              {(v.productos ?? []).length > 0 && (
                                <div className={styles.detalleProductos}>
                                  {v.productos.map((p, i) => {
                                    const prodName = safeStr(p.nombre);
                                    const prodQty = safeNum(p.quantity, 1);
                                    const prodPrice = safeNum(p.precio);
                                    return (
                                      <span key={i} className={styles.detalleProducto}>
                                        {prodName}{prodQty > 1 ? ` x${prodQty}` : ''} <em>{fmt(prodPrice * prodQty)}</em>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {totalBolsas > 0 && (
                  <div className={styles.totalRegistradoRow}>
                    <span>Total ventas locales:</span>
                    <strong>{fmt(totalBolsas)}</strong>
                  </div>
                )}
                {totalBolsas === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray)', margin: '0.5rem 0 0' }}>
                    Sin ventas locales registradas para esta fecha.
                  </p>
                )}
              </div>

              {/* Cuadre de caja */}
              <div className={styles.sectionBox}>
                <h3 className={styles.sectionTitle}>Cuadre de caja</h3>
                <p className={styles.sectionDesc}>
                  Ingresá el TOTAL recaudado en cada método (incluye ventas locales). El sistema calcula el monto pendiente.
                </p>

                <div className="form-group">
                  <label>Saldo inicial (dinero en caja al abrir)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.saldo_inicial}
                    onChange={(e) => setField('saldo_inicial', e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                  />
                </div>

                <div className={styles.cuadreGrid}>
                  <div className={styles.cuadreItem}>
                    <label>Efectivo (total recaudado)</label>
                    <input
                      type="number" min={0}
                      value={form.ventas_efectivo}
                      onChange={(e) => setField('ventas_efectivo', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                    <div className={styles.balanceLine}>
                      <span>− Ventas locales: {fmt(bolsas.efectivo)}</span>
                      <span className={styles.sueldoTag}>= Pendiente: {fmt(pendiente.efectivo)}</span>
                    </div>
                  </div>

                  <div className={styles.cuadreItem}>
                    <label>Transferencias / MP (total recibido)</label>
                    <input
                      type="number" min={0}
                      value={form.ventas_transferencia}
                      onChange={(e) => setField('ventas_transferencia', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                    <div className={styles.balanceLine}>
                      <span>− Ventas locales: {fmt(bolsas.transferencia)}</span>
                      <span className={styles.sueldoTag}>= Pendiente: {fmt(pendiente.transferencia)}</span>
                    </div>
                  </div>

                  <div className={styles.cuadreItem}>
                    <label>Tarjeta (total recaudado)</label>
                    <input
                      type="number" min={0}
                      value={form.ventas_tarjeta}
                      onChange={(e) => setField('ventas_tarjeta', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                    <div className={styles.balanceLine}>
                      <span>− Ventas locales: {fmt(bolsas.tarjeta)}</span>
                      <span className={styles.sueldoTag}>= Pendiente: {fmt(pendiente.tarjeta)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className={styles.resumen}>
                <span>Total recaudado:</span>
                <strong>{fmt(sumaContado)}</strong>
                <span>Total ventas locales:</span>
                <strong>{fmt(totalBolsas)}</strong>
                <div className={styles.resumenTotal}>
                  <span>Monto pendiente (alimento suelto)</span>
                  <strong className={styles.sueldoFinal}>{fmt(totalPendiente)}</strong>
                </div>
              </div>

              <div className="form-group">
                <label>Notas (opcional)</label>
                <input
                  value={form.notas}
                  onChange={(e) => setField('notas', e.target.value)}
                  placeholder="Ej: faltó producto X, sobrante por vuelto..."
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setEditingId(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Actualizar cierre' : 'Guardar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
