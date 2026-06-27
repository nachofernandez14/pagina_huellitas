'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface SupplierBalance {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  total_compras: number;
  total_pagado: number;
  saldo_pendiente: number;
}

interface Supplier {
  nombre: string;
  contacto?: string;
  telefono?: string;
  notas?: string;
}

const EMPTY: Supplier = { nombre: '', contacto: '', telefono: '', notas: '' };

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function ProveedoresAdmin() {
  const [suppliers, setSuppliers] = useState<SupplierBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; data: Supplier; id?: string }>({ open: false, data: EMPTY });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/admin/suppliers');
    if (r.ok) setSuppliers(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof Supplier, v: string) =>
    setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleSave = async () => {
    if (!modal.data.nombre.trim()) { flash('❌ El nombre es requerido'); return; }
    setSaving(true);
    const r = modal.id
      ? await fetch(`/api/admin/suppliers/${modal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify(modal.data) })
      : await fetch('/api/admin/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify(modal.data) });
    setSaving(false);
    if (r.ok) { flash(modal.id ? '✅ Proveedor actualizado' : '✅ Proveedor creado'); setModal((m) => ({ ...m, open: false })); load(); }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Proveedores</h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>{suppliers.length} proveedores activos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, data: { ...EMPTY } })}>
          + Nuevo proveedor
        </button>
      </div>

      {msg && <div className={styles.toast}>{msg}</div>}

      {loading ? (
        <p className="text-gray">Cargando...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Telefono</th>
                <th>Compras</th>
                <th>Pagado</th>
                <th>Saldo pendiente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                  <td>{s.contacto ?? '—'}</td>
                  <td>{s.telefono ?? '—'}</td>
                  <td>{fmt(s.total_compras)}</td>
                  <td>{fmt(s.total_pagado)}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: s.saldo_pendiente > 0 ? 'var(--accent)' : 'var(--green-dark)' }}>
                      {fmt(s.saldo_pendiente)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/admin/proveedores/${s.id}`} className={styles.btnView}>Ver detalle</Link>
                      <button
                        className={styles.btnEdit}
                        onClick={() => setModal({ open: true, data: { nombre: s.nombre, contacto: s.contacto ?? '', telefono: s.telefono ?? '' }, id: s.id })}
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Aún no hay proveedores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className={styles.overlay} onClick={() => setModal((m) => ({ ...m, open: false }))}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modal.id ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
              <button className={styles.close} onClick={() => setModal((m) => ({ ...m, open: false }))}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre *</label>
                  <input value={modal.data.nombre} onChange={(e) => set('nombre', e.target.value)} />
                </div>
                <div className="form-group"><label>Contacto</label><input value={modal.data.contacto ?? ''} onChange={(e) => set('contacto', e.target.value)} /></div>
                <div className="form-group"><label>Teléfono</label><input value={modal.data.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} /></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Notas</label><input value={modal.data.notas ?? ''} onChange={(e) => set('notas', e.target.value)} /></div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setModal((m) => ({ ...m, open: false }))}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
