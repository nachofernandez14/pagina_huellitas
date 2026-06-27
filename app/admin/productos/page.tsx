'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Product, ProductCategory } from '@/types';
import { generateProductSlug } from '@/lib/slug';
import ImageUpload from '@/components/admin/ImageUpload';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/admin/ConfirmModal';
import styles from './page.module.css';

const CATEGORIES: ProductCategory[] = ['perros', 'cachorros', 'gatos', 'gatitos', 'granos', 'accesorios'];
const EMPTY: Partial<Product> = { nombre: '', categoria: 'perros', subcategoria: 'alimentos', kg: '', precio: 0, precio_costo: null, precio_local: null, stock: 100, activo: true, supplier_id: null, proteina: '', kg_regalo: '', descuento: null, promo_label: '' };

interface Supplier { id: string; nombre: string; }
const PAGE_SIZE = 20;

function fmt(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function ProductosAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageRef = useRef(page);
  pageRef.current = page;
  const [modal, setModal] = useState<{ open: boolean; data: Partial<Product>; isNew: boolean }>({
    open: false, data: EMPTY, isNew: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });

  const flash = (m: string) => setMsg(m);

  const load = useCallback(async (p: number = 1) => {
    setPage(p);
    setLoading(true);
    const offset = (p - 1) * PAGE_SIZE;
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), activo: 'all' });
    if (catFilter) params.set('categoria', catFilter);
    if (search) params.set('q', search);
    const res = await fetch(`/api/products?${params}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      setProducts(json.data ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [search, catFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, catFilter]);

  // Fetch suppliers once on mount (they rarely change)
  useEffect(() => {
    fetch('/api/admin/suppliers?simple=1', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSuppliers(Array.isArray(data) ? data : (data.data ?? [])));
  }, []);

  // Debounce search: wait 400 ms after the user stops typing before triggering load
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => setModal({ open: true, data: { ...EMPTY }, isNew: true });
  const openEdit = (p: Product) => setModal({ open: true, data: { ...p }, isNew: false });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const { id, created_at, updated_at, ...body } = modal.data as Product;
    body.slug = generateProductSlug(body.nombre, body.kg);
    let r: Response;
    if (modal.isNew) {
      r = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify(body), cache: 'no-store' });
    } else {
      r = await fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify(body), cache: 'no-store' });
    }
    setSaving(false);
    if (r.ok) {
      flash(modal.isNew ? '✅ Producto creado' : '✅ Producto actualizado');
      closeModal();
      load(pageRef.current);
    } else {
      const text = await r.text();
      const e = text ? JSON.parse(text) : {};
      flash(`❌ ${e.error ?? 'Error al guardar'}`);
    }
  }, [modal, saving, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key === 'Enter' && modal.open && !saving) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'textarea') return; // allow newlines in textareas
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal.open, saving, handleSave]);

  const handleDelete = async (p: Product) => {
    setConfirmDelete({ open: true, product: p });
  };

  const doDelete = async () => {
    const p = confirmDelete.product;
    if (!p) return;
    setConfirmDelete({ open: false, product: null });
    const r = await fetch(`/api/products/${p.id}`, { method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest' }, cache: 'no-store' });
    if (r.ok) { flash('🗑️ Producto eliminado'); load(pageRef.current); }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  const set = (k: keyof Product, v: unknown) =>
    setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Productos</h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>{total} producto{total !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo producto</button>
      </div>

      <Toast message={msg} onDismiss={() => setMsg('')} />

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Buscar..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={styles.searchInput}
        />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={styles.filterSelect}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray">Cargando...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th className={styles.colHideSm}>Categoría</th>
                <th className={styles.colHideMd}>Proveedor</th>
                <th>Kg</th>
                <th>Precio web</th>
                <th className={styles.colHideMd}>Precio local</th>
                <th>Oferta</th>
                <th className={styles.colHideMd}>Precio costo</th>
                <th className={styles.colHideMd}>Proteína</th>
                <th className={styles.colHideMd}>+ Regalo</th>
                <th>Stock</th>
                <th className={styles.colHideSm}>Activo</th>
                  <th className={styles.stickyCol}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={`${!p.activo ? styles.inactive : ''} ${styles.rowClickable}`} onClick={() => openEdit(p)}>
                  <td className={styles.nombre}>{p.nombre}</td>
                  <td className={styles.colHideSm}><span className="badge">{p.categoria}</span></td>
                  <td className={styles.colHideMd} style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                    {suppliers.find((s) => s.id === p.supplier_id)?.nombre ?? '—'}
                  </td>
                  <td>{p.kg ?? '—'}</td>
                  <td>{fmt(p.precio)}</td>
                  <td className={styles.colHideMd} style={{ fontSize: '0.82rem' }}>{fmt(p.precio_local ?? null)}</td>
                  <td>
                    {p.promo_label
                      ? <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '99px', padding: '0.15rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}>{p.promo_label}</span>
                      : p.descuento != null && p.descuento > 0
                      ? <span style={{ background: '#e53935', color: '#fff', borderRadius: '99px', padding: '0.15rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}>{fmt(p.descuento)}</span>
                      : <span style={{ color: 'var(--gray)' }}>—</span>}
                  </td>
                  <td className={styles.colHideMd} style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>{fmt(p.precio_costo ?? null)}</td>
                  <td className={styles.colHideMd} style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{p.proteina ?? '—'}</td>
                  <td className={styles.colHideMd} style={{ fontSize: '0.8rem' }}>
                    {p.kg_regalo ? <span style={{ color: '#c05e28', fontWeight: 700 }}>+{p.kg_regalo}</span> : <span style={{ color: 'var(--gray)' }}>—</span>}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: p.stock < 10 ? 'var(--accent)' : 'var(--dark)' }}>
                      {p.stock}
                    </span>
                  </td>
                  <td className={styles.colHideSm}>
                    <span className={p.activo ? styles.pill : styles.pillOff}>
                      {p.activo ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className={styles.stickyCol}>
                    <div className={styles.actions}>
                      <button className={styles.btnEdit} onClick={(e) => { e.stopPropagation(); openEdit(p); }}>Editar</button>
                      <button className={styles.btnDel} onClick={(e) => { e.stopPropagation(); handleDelete(p); }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
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

      {/* Modal */}
      {modal.open && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{modal.isNew ? 'Nuevo producto' : 'Editar producto'}</h2>
              <button className={styles.close} onClick={closeModal}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={modal.data.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Categoría *</label>
                  <select value={modal.data.categoria ?? 'perros'} onChange={(e) => set('categoria', e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <select
                    value={modal.data.supplier_id ?? ''}
                    onChange={(e) => set('supplier_id', e.target.value || null)}
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subcategoría</label>
                  <input value={modal.data.subcategoria ?? ''} onChange={(e) => set('subcategoria', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Kg / Presentación</label>
                  <input value={modal.data.kg ?? ''} onChange={(e) => set('kg', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Precio web ($)</label>
                  <input type="number" min={0} value={modal.data.precio ?? ''} onChange={(e) => set('precio', parseFloat(e.target.value) || null)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} />
                </div>
                <div className="form-group">
                  <label>Precio local ($) <span style={{fontWeight:400,color:'var(--gray)',fontSize:'0.78rem'}}>(venta en local, sin impuestos web)</span></label>
                  <input type="number" min={0} value={modal.data.precio_local ?? ''} onChange={(e) => set('precio_local', parseFloat(e.target.value) || null)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} placeholder="Dejar vacío si igual al precio web" />
                </div>
                <div className="form-group">
                  <label>Precio costo ($)</label>
                  <input type="number" min={0} value={modal.data.precio_costo ?? ''} onChange={(e) => set('precio_costo', parseFloat(e.target.value) || null)} placeholder="Precio de compra" onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input type="number" min={0} value={modal.data.stock ?? 0} onChange={(e) => set('stock', parseInt(e.target.value, 10) || 0)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} />
                </div>
                <div className="form-group">
                  <label>Proteína (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      style={{ flex: 1 }}
                      value={
                        modal.data.proteina
                          ? parseFloat(modal.data.proteina as string) || ''
                          : ''
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        set('proteina', v !== '' ? `${v}%` : '');
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      onFocus={(e) => e.target.select()}
                      placeholder="Ej: 28"
                    />
                    <span style={{ fontWeight: 600, color: 'var(--gray)' }}>%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Kg de regalo 🎁</label>
                  <input value={modal.data.kg_regalo ?? ''} onChange={(e) => set('kg_regalo', e.target.value || null)} placeholder="Ej: 3kg, 500g" />
                </div>
                {/* ── Oferta / Promo ───────────────────────────────── */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', margin: '0.5rem 0 0.75rem', borderTop: '1px dashed var(--gray-light)', paddingTop: '0.75rem' }}>
                    🏷️ Oferta / Promo
                  </p>
                  <div className={styles.grid2}>
                    <div className="form-group">
                      <label>Precio de oferta ($) <span style={{fontWeight:400,color:'var(--gray)',fontSize:'0.78rem'}}>(se tachará el precio original)</span></label>
                      <input type="number" min={0} value={modal.data.descuento ?? ''} onChange={(e) => set('descuento', parseFloat(e.target.value) || null)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} placeholder="Ej: 10000" />
                    </div>
                    <div className="form-group">
                      <label>Etiqueta promo <span style={{fontWeight:400,color:'var(--gray)',fontSize:'0.78rem'}}>(ej: 3x2, 4x3, 2do al 50%)</span></label>
                      <input value={modal.data.promo_label ?? ''} onChange={(e) => set('promo_label', e.target.value || null)} placeholder="Ej: 3x2, 4x3, 2do al 50%" />
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Imagen del producto</label>
                  {/* Reutilizar imagen de hermanos (mismo nombre, distinto kg) */}
                  {(() => {
                    const nombre = modal.data.nombre?.trim() ?? '';
                    const siblings = nombre
                      ? products.filter((p) => p.nombre === nombre && p.imagen && p.id !== modal.data.id)
                      : [];
                    if (siblings.length === 0) return null;
                    return (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem', padding: '0.5rem 0.6rem', background: 'var(--green-light, #f0faf3)', borderRadius: '8px', border: '1px solid var(--green-mid, #b2dfca)' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--green-dark)', fontWeight: 600, alignSelf: 'center', marginRight: '0.25rem' }}>📷 Reutilizar foto:</span>
                        {siblings.map((s) => {
                          const src = s.imagen!.startsWith('http') ? s.imagen! : `/images/${s.imagen}`;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              title={`Usar foto de ${s.kg ?? s.nombre}`}
                              onClick={() => set('imagen', s.imagen)}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', background: '#fff', border: modal.data.imagen === s.imagen ? '2px solid var(--green-dark)' : '1px solid var(--gray-light)', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer' }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt={s.kg ?? ''} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: '4px' }} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>{s.kg ?? '—'}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <ImageUpload
                    currentImage={modal.data.imagen}
                    onChange={(url) => set('imagen', url)}
                    onError={flash}
                  />
                </div>
                <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={modal.data.activo ?? true} onChange={(e) => set('activo', e.target.checked)} style={{ width: 'auto' }} />
                    Activo (visible en tienda)
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        title="Eliminar producto"
        message={`¿Eliminás "${confirmDelete.product?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete({ open: false, product: null })}
      />
    </div>
  );
}
