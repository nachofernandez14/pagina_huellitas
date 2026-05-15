'use client';

import { useEffect, useState, useCallback } from 'react';
import ConfirmModal from '@/components/admin/ConfirmModal';
import styles from './page.module.css';

interface ExpenseCategory { id: string; nombre: string; }
interface Expense {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  category_id: string | null;
  notas: string | null;
  expense_categories?: { nombre: string } | null;
}

interface FormData { fecha: string; descripcion: string; monto: string; category_id: string; notas: string; }

const EMPTY: FormData = { fecha: new Date().toISOString().split('T')[0], descripcion: '', monto: '', category_id: '', notas: '' };

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function GastosAdmin() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modal, setModal] = useState<{ open: boolean; data: FormData; id?: string }>({ open: false, data: { ...EMPTY } });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; desc: string }>({ open: false, id: '', desc: '' });

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (catFilter) params.set('category_id', catFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const r = await fetch(`/api/admin/expenses?${params}`);
    if (r.ok) setExpenses(await r.json());
    setLoading(false);
  }, [catFilter, from, to]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/admin/expenses')
      .then(() => {}) // categories come from a separate endpoint
      .catch(() => {});
    // Load expense categories via categories API that has no auth requirement pattern
    fetch('/api/admin/expense-categories')
      .then((r) => r.ok ? r.json() : [])
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const set = (k: keyof FormData, v: string) =>
    setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleSave = async () => {
    if (!modal.data.descripcion.trim() || !modal.data.monto || !modal.data.fecha) {
      flash('❌ Fecha, descripción y monto son requeridos'); return;
    }
    setSaving(true);
    const body = {
      ...modal.data,
      monto: parseFloat(modal.data.monto),
      category_id: modal.data.category_id || null,
    };
    const r = modal.id
      ? await fetch(`/api/admin/expenses/${modal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/admin/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (r.ok) { flash(modal.id ? '✅ Gasto actualizado' : '✅ Gasto registrado'); setModal((m) => ({ ...m, open: false })); load(); }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  const handleDelete = async (id: string, desc: string) => {
    setConfirmDelete({ open: true, id, desc });
  };

  const doDelete = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ open: false, id: '', desc: '' });
    const r = await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
    if (r.ok) { flash('✅ Eliminado'); load(); }
  };

  const totalMes = expenses
    .filter((e) => {
      const now = new Date();
      const d = new Date(e.fecha + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.monto), 0);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gastos</h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>Total este mes: <strong style={{ color: 'var(--accent)' }}>{fmt(totalMes)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, data: { ...EMPTY } })}>
          + Registrar gasto
        </button>
      </div>

      {msg && <div className={styles.toast}>{msg}</div>}

      {/* Filters */}
      <div className={styles.filters}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.8rem' }}>Categoría</label>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ fontSize: '0.875rem' }}>
            <option value="">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.8rem' }}>Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.8rem' }}>Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(catFilter || from || to) && (
          <button className="btn btn-ghost" style={{ alignSelf: 'flex-end', fontSize: '0.85rem' }} onClick={() => { setCatFilter(''); setFrom(''); setTo(''); }}>
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray">Cargando...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Notas</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                  <td>{e.descripcion}</td>
                  <td><span className={styles.catBadge}>{e.expense_categories?.nombre ?? '—'}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(e.monto)}</td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{e.notas ?? '—'}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.btnEdit}
                        onClick={() => setModal({ open: true, data: { fecha: e.fecha, descripcion: e.descripcion, monto: String(e.monto), category_id: e.category_id ?? '', notas: e.notas ?? '' }, id: e.id })}
                      >Editar</button>
                      <button className={styles.btnDel} onClick={() => handleDelete(e.id, e.descripcion)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Sin gastos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className={styles.overlay} onClick={() => setModal((m) => ({ ...m, open: false }))}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modal.id ? 'Editar gasto' : 'Registrar gasto'}</h2>
              <button className={styles.close} onClick={() => setModal((m) => ({ ...m, open: false }))}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <div className="form-group"><label>Fecha *</label><input type="date" value={modal.data.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
                <div className="form-group"><label>Monto ($) *</label><input type="number" min={0} step="0.01" value={modal.data.monto} onChange={(e) => set('monto', e.target.value)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} /></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Descripción *</label><input value={modal.data.descripcion} onChange={(e) => set('descripcion', e.target.value)} /></div>
                <div className="form-group">
                  <label>Categoría</label>
                  <select value={modal.data.category_id} onChange={(e) => set('category_id', e.target.value)}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Notas</label><input value={modal.data.notas} onChange={(e) => set('notas', e.target.value)} /></div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setModal((m) => ({ ...m, open: false }))}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        title="Eliminar gasto"
        message={`¿Eliminás el gasto "${confirmDelete.desc}"?`}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete({ open: false, id: '', desc: '' })}
      />
    </div>
  );
}
