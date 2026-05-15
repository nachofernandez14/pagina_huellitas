'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Product, ProductCategory } from '@/types';
import ImageUpload from '@/components/admin/ImageUpload';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/admin/ConfirmModal';
import styles from './page.module.css';

const CATEGORIES: ProductCategory[] = ['perros', 'cachorros', 'gatos', 'gatitos', 'granos', 'accesorios'];
const EMPTY: Partial<Product> = { nombre: '', categoria: 'perros', subcategoria: 'alimentos', kg: '', precio: 0, precio_costo: null, stock: 100, activo: true, supplier_id: null, proteina: '', kg_regalo: '', descuento: null, promo_label: '' };

interface Supplier { id: string; nombre: string; }
const PAGE_SIZE = 20;

function fmt(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function ProductosAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; data: Partial<Product>; isNew: boolean }>({
    open: false, data: EMPTY, isNew: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });

  const flash = (m: string) => setMsg(m);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '1000', activo: 'all' });
    if (catFilter) params.set('categoria', catFilter);
    if (search) params.set('q', search);
    const [prodRes, suppRes] = await Promise.all([
      fetch(`/api/products?${params}`),
      fetch('/api/admin/suppliers?simple=1'),
    ]);
    if (prodRes.ok) setProducts(await prodRes.json());
    if (suppRes.ok) {
      const suppData = await suppRes.json();
      setSuppliers(Array.isArray(suppData) ? suppData : (suppData.data ?? []));
    }
    setLoading(false);
  }, [search, catFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => setModal({ open: true, data: { ...EMPTY }, isNew: true });
  const openEdit = (p: Product) => setModal({ open: true, data: { ...p }, isNew: false });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSave = async () => {
    setSaving(true);
    const { id, created_at, updated_at, ...body } = modal.data as Product;
    let r: Response;
    if (modal.isNew) {
      r = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      r = await fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setSaving(false);
    if (r.ok) { flash(modal.isNew ? '✅ Producto creado' : '✅ Producto actualizado'); closeModal(); load(); }
    else { const text = await r.text(); const e = text ? JSON.parse(text) : {}; flash(`❌ ${e.error ?? 'Error al guardar'}`); }
  };

  const handleDelete = async (p: Product) => {
    setConfirmDelete({ open: true, product: p });
  };

  const doDelete = async () => {
    const p = confirmDelete.product;
    if (!p) return;
    setConfirmDelete({ open: false, product: null });
    const r = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
    if (r.ok) { flash('🗑️ Producto eliminado'); load(); }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  const set = (k: keyof Product, v: unknown) =>
    setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  const filtered = products.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, catFilter]);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Productos</h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo producto</button>
      </div>

      <Toast message={msg} onDismiss={() => setMsg('')} />

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                <th>Precio venta</th>
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
              {paginated.map((p) => (
                <tr key={p.id} className={`${!p.activo ? styles.inactive : ''} ${styles.rowClickable}`} onClick={() => openEdit(p)}>
                  <td className={styles.nombre}>{p.nombre}</td>
                  <td className={styles.colHideSm}><span className="badge">{p.categoria}</span></td>
                  <td className={styles.colHideMd} style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                    {suppliers.find((s) => s.id === p.supplier_id)?.nombre ?? '—'}
                  </td>
                  <td>{p.kg ?? '—'}</td>
                  <td>{fmt(p.precio)}</td>
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
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Anterior
          </button>
          <span className={styles.pageCurrent}>{page} / {totalPages}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
                  <label>Precio ($)</label>
                  <input type="number" min={0} value={modal.data.precio ?? ''} onChange={(e) => set('precio', parseFloat(e.target.value) || null)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} />
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
