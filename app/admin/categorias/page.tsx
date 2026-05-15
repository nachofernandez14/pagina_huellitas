'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from '@/components/admin/ConfirmModal';
import styles from './page.module.css';

interface Category {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  icono: string | null;
  activo: boolean;
  orden: number;
}

const EMPTY: Partial<Category> = { nombre: '', slug: '', descripcion: '', icono: '', activo: true, orden: 0 };

export default function CategoriasAdmin() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: Partial<Category>; isNew: boolean }>({ open: false, data: EMPTY, isNew: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; cat: Category | null }>({ open: false, cat: null });

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/admin/categories');
    if (r.ok) setCats(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof Category, v: unknown) =>
    setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleSave = async () => {
    if (!modal.data.nombre || !modal.data.slug) { flash('❌ Nombre y slug son requeridos'); return; }
    setSaving(true);
    const r = modal.isNew
      ? await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modal.data) })
      : await fetch(`/api/admin/categories/${modal.data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modal.data) });
    setSaving(false);
    if (r.ok) { flash(modal.isNew ? '✅ Categoría creada' : '✅ Categoría actualizada'); setModal((m) => ({ ...m, open: false })); load(); }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  const handleDelete = async (c: Category) => {
    setConfirmDelete({ open: true, cat: c });
  };

  const doDelete = async () => {
    const c = confirmDelete.cat;
    if (!c) return;
    setConfirmDelete({ open: false, cat: null });
    const r = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    if (r.ok) { flash('🗑️ Categoría eliminada'); load(); }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Categorías</h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>{cats.length} categorías</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, data: { ...EMPTY }, isNew: true })}>
          + Nueva categoría
        </button>
      </div>

      {msg && <div className={styles.toast}>{msg}</div>}

      {loading ? (
        <p className="text-gray">Cargando...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr><th>Ícono</th><th>Nombre</th><th>Slug</th><th>Descripción</th><th>Orden</th><th>Activo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className={!c.activo ? styles.inactive : ''}>
                  <td style={{ fontSize: '1.5rem' }}>{c.icono ?? ''}</td>
                  <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                  <td><code className={styles.code}>{c.slug}</code></td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{c.descripcion ?? '—'}</td>
                  <td>{c.orden}</td>
                  <td><span className={c.activo ? styles.pill : styles.pillOff}>{c.activo ? 'Sí' : 'No'}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => setModal({ open: true, data: { ...c }, isNew: false })}>Editar</button>
                      <button className={styles.btnDel} onClick={() => handleDelete(c)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className={styles.overlay} onClick={() => setModal((m) => ({ ...m, open: false }))}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modal.isNew ? 'Nueva categoría' : 'Editar categoría'}</h2>
              <button className={styles.close} onClick={() => setModal((m) => ({ ...m, open: false }))}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={modal.data.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Slug * (sin espacios, minúsculas)</label>
                  <input value={modal.data.slug ?? ''} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                </div>
                <div className="form-group">
                  <label>Ícono (emoji)</label>
                  <input value={modal.data.icono ?? ''} onChange={(e) => set('icono', e.target.value)} placeholder="🐶" />
                </div>
                <div className="form-group">
                  <label>Orden</label>
                  <input type="number" min={0} value={modal.data.orden ?? 0} onChange={(e) => set('orden', parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Descripción</label>
                  <input value={modal.data.descripcion ?? ''} onChange={(e) => set('descripcion', e.target.value)} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={modal.data.activo ?? true} onChange={(e) => set('activo', e.target.checked)} style={{ width: 'auto' }} />
                    Activa
                  </label>
                </div>
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
        title="Eliminar categoría"
        message={`¿Eliminás la categoría "${confirmDelete.cat?.nombre}"?`}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete({ open: false, cat: null })}
      />
    </div>
  );
}
