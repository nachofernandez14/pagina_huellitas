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
  notas: string | null;
}

interface VentasHoy {
  [formaPago: string]: number;
}

const EMPTY_FORM = {
  fecha: new Date().toISOString().split('T')[0],
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
  return e.ventas_efectivo + e.ventas_tarjeta + e.ventas_transferencia;
}

export default function CajaPage() {
  const [entries, setEntries] = useState<CajaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [ventasHoy, setVentasHoy] = useState<VentasHoy>({});
  const downTarget = useRef<EventTarget | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/caja?ventas=true');
    if (r.ok) {
      const json = await r.json();
      if (json.entries) {
        setEntries(json.entries);
        setVentasHoy(json.ventasHoy ?? {});
      } else {
        setEntries(json);
        setVentasHoy({});
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // Recorded sales: "mp" se unifica con "transferencia"
  const ventasRegistradas = {
    efectivo: ventasHoy['efectivo'] ?? 0,
    transferencia: (ventasHoy['mp'] ?? 0) + (ventasHoy['mercadopago'] ?? 0) + (ventasHoy['transferencia'] ?? 0),
    tarjeta: ventasHoy['tarjeta'] ?? 0,
  };
  const totalRegistrado = ventasRegistradas.efectivo + ventasRegistradas.transferencia + ventasRegistradas.tarjeta;

  // Counted amounts from form inputs
  const counted = {
    efectivo: parseFloat(form.ventas_efectivo) || 0,
    transferencia: parseFloat(form.ventas_transferencia) || 0,
    tarjeta: parseFloat(form.ventas_tarjeta) || 0,
  };
  const totalContado = counted.efectivo + counted.transferencia + counted.tarjeta;

  // Differences
  const diferencia = {
    efectivo: counted.efectivo - ventasRegistradas.efectivo,
    transferencia: counted.transferencia - ventasRegistradas.transferencia,
    tarjeta: counted.tarjeta - ventasRegistradas.tarjeta,
  };
  const diferenciaTotal = totalContado - totalRegistrado;

  const handleSave = async () => {
    setSaving(true);
    const r = await fetch('/api/admin/caja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        fecha: form.fecha,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
        ventas_efectivo: counted.efectivo,
        ventas_mercadopago: 0,
        ventas_tarjeta: counted.tarjeta,
        ventas_transferencia: counted.transferencia,
        notas: form.notas || null,
      }),
    });
    setSaving(false);
    if (r.ok) {
      flash('✅ Caja guardada');
      setModal(false);
      load();
    } else {
      const e = await r.json();
      flash(`❌ ${e.error}`);
    }
  };

  // KPIs del mes actual
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const monthEntries = entries.filter((e) => e.fecha.startsWith(thisMonth));
  const totalMes = monthEntries.reduce((s, e) => s + totalVentasCaja(e), 0);
  const totalEfectivoMes = monthEntries.reduce((s, e) => s + e.ventas_efectivo, 0);
  const totalTransfMes = monthEntries.reduce((s, e) => s + e.ventas_transferencia, 0);

  const openNew = () => {
    const existing = entries.find((e) => e.fecha === today);
    if (existing) {
      // Al editar, sumamos ventas_mercadopago + ventas_transferencia en un solo campo
      const transfTotal = existing.ventas_transferencia + existing.ventas_mercadopago;
      setForm({
        fecha: existing.fecha,
        saldo_inicial: String(existing.saldo_inicial),
        ventas_efectivo: String(existing.ventas_efectivo),
        ventas_tarjeta: String(existing.ventas_tarjeta),
        ventas_transferencia: String(transfTotal),
        notas: existing.notas ?? ''
      });
    } else {
      setForm({ ...EMPTY_FORM, fecha: today });
    }
    setModal(true);
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Caja diaria</h1>
          <p className={styles.subtitle}>Registrá el movimiento de caja al cierre de cada jornada</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          + Registrar cierre de caja
        </button>
      </div>

      {msg && <div className={styles.toast}>{msg}</div>}

      {/* KPI strip */}
      <div className={styles.kpiStrip}>
        <div className={`${styles.kpi} ${styles.kpiGreen}`}>
          <span>Total contado del mes</span>
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
                <th>Efectivo</th>
                <th>Transferencias</th>
                <th>Tarjeta</th>
                <th>Total contado</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className={e.fecha === today ? styles.todayRow : ''}>
                  <td className={styles.fechaCell}>
                    {new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </td>
                  <td>{fmt(e.saldo_inicial)}</td>
                  <td>{fmt(e.ventas_efectivo)}</td>
                  <td>{fmt(e.ventas_transferencia + e.ventas_mercadopago)}</td>
                  <td>{fmt(e.ventas_tarjeta)}</td>
                  <td className={styles.totalCell}>{fmt(totalVentasCaja(e))}</td>
                  <td className={styles.notasCell}>{e.notas ?? '—'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>
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
              <h2>Cierre de caja</h2>
              <button className={styles.close} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" value={form.fecha} onChange={(e) => setField('fecha', e.target.value)} />
              </div>

              {/* Ventas registradas del día (auto) */}
              <div className={styles.sectionBox}>
                <h3 className={styles.sectionTitle}>Ventas registradas del día</h3>
                <p className={styles.sectionDesc}>Ventas locales + pedidos web pagados. Se restan automáticamente al hacer el cuadre.</p>
                <div className={styles.registradasGrid}>
                  <span>Efectivo</span><strong>{fmt(ventasRegistradas.efectivo)}</strong>
                  <span>Transferencias / MP</span><strong>{fmt(ventasRegistradas.transferencia)}</strong>
                  <span>Tarjeta</span><strong>{fmt(ventasRegistradas.tarjeta)}</strong>
                  <span className={styles.totalRegLabel}>Total registrado</span>
                  <strong className={styles.totalRegValue}>{fmt(totalRegistrado)}</strong>
                </div>
              </div>

              {/* Cuadre de caja */}
              <div className={styles.sectionBox}>
                <h3 className={styles.sectionTitle}>Cuadre de caja</h3>
                <p className={styles.sectionDesc}>Ingresá lo que contás / recibiste. La diferencia se calcula automáticamente.</p>

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
                    <label>Efectivo en caja</label>
                    <input
                      type="number" min={0}
                      value={form.ventas_efectivo}
                      onChange={(e) => setField('ventas_efectivo', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                    <div className={styles.diffLine}>
                      <span>Registrado: {fmt(ventasRegistradas.efectivo)}</span>
                      <span className={diferencia.efectivo >= 0 ? styles.diffPos : styles.diffNeg}>
                        {diferencia.efectivo >= 0 ? '+' : ''}{fmt(diferencia.efectivo)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cuadreItem}>
                    <label>Transferencias / Mercado Pago</label>
                    <input
                      type="number" min={0}
                      value={form.ventas_transferencia}
                      onChange={(e) => setField('ventas_transferencia', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                    <div className={styles.diffLine}>
                      <span>Registrado: {fmt(ventasRegistradas.transferencia)}</span>
                      <span className={diferencia.transferencia >= 0 ? styles.diffPos : styles.diffNeg}>
                        {diferencia.transferencia >= 0 ? '+' : ''}{fmt(diferencia.transferencia)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cuadreItem}>
                    <label>Tarjeta</label>
                    <input
                      type="number" min={0}
                      value={form.ventas_tarjeta}
                      onChange={(e) => setField('ventas_tarjeta', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                    <div className={styles.diffLine}>
                      <span>Registrado: {fmt(ventasRegistradas.tarjeta)}</span>
                      <span className={diferencia.tarjeta >= 0 ? styles.diffPos : styles.diffNeg}>
                        {diferencia.tarjeta >= 0 ? '+' : ''}{fmt(diferencia.tarjeta)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className={styles.resumen}>
                <span>Total contado:</span>
                <strong>{fmt(totalContado)}</strong>
                <span>Total registrado:</span>
                <strong>{fmt(totalRegistrado)}</strong>
                <div className={styles.resumenTotal}>
                  <span>Diferencia total</span>
                  <strong className={diferenciaTotal >= 0 ? styles.diffPos : styles.diffNeg}>
                    {diferenciaTotal >= 0 ? '+' : ''}{fmt(diferenciaTotal)}
                  </strong>
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
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
