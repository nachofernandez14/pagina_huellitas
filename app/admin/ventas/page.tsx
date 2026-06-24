'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Product } from '@/types';
import styles from './page.module.css';

interface Sale {
  id: string;
  created_at: string;
  canal: string | null;
  estado: string;
  total: number;
  guest_nombre: string | null;
  forma_pago: string | null;
  notas: string | null;
  productos: Record<string, unknown>[];
}

interface LineItem { product: Product | null; nombre: string; precio: number; cantidad: number }

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function safeStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return fallback;
}

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || fallback;
  return fallback;
}

export default function VentasAdmin() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [canal, setCanal] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');

  // New local sale modal
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [guestNombre, setGuestNombre] = useState('');
  const [formaPago, setFormaPago] = useState('efectivo');
  const [notas, setNotas] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [saving, setSaving] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Detail modal
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const loadSales = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: '200' });
    if (canal) p.set('canal', canal);
    if (from)  p.set('from', from);
    if (to)    p.set('to', to);
    const r = await fetch(`/api/admin/sales?${p}`);
    if (r.ok) setSales(await r.json());
    setLoading(false);
  }, [canal, from, to]);

  useEffect(() => { loadSales(); }, [loadSales]);

  const openModal = async () => {
    if (!products.length) {
      const r = await fetch('/api/products?limit=300&offset=0');
      if (r.ok) {
        const json = await r.json();
        setProducts(json.data ?? []);
      }
    }
    setItems([]);
    setGuestNombre('');
    setFormaPago('efectivo');
    setNotas('');
    setDescuento(0);
    setProductQuery('');
    setProductDropdownOpen(false);
    setModalOpen(true);
  };

  const addItem = (p: Product) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.product?.id === p.id);
      if (ex) return prev.map((i) => i.product?.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { product: p, nombre: `${p.nombre}${p.kg ? ` ${p.kg}` : ''}`, precio: p.precio_local ?? p.precio ?? 0, cantidad: 1 }];
    });
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const total = Math.max(0, subtotal - descuento);

  const handleSubmit = async () => {
    if (!items.length) { flash('❌ Agregá al menos un producto'); return; }
    setSaving(true);
    const r = await fetch('/api/admin/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        productos: items.map((i) => ({ id: i.product?.id, nombre: i.nombre, precio: i.precio, quantity: i.cantidad })),
        total,
        guest_nombre: guestNombre || undefined,
        forma_pago: formaPago,
        notas: notas || undefined,
        descuento_manual: descuento,
      }),
    });
    setSaving(false);
    if (r.ok) { flash('✅ Venta registrada'); setModalOpen(false); loadSales(); }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  const totalVentas = sales.reduce((s, v) => s + Number(v.total), 0);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ventas</h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>
            {sales.length} ventas · Total: <strong>{fmt(totalVentas)}</strong>
          </p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>+ Registrar venta local</button>
      </div>

      {msg && <div className={styles.toast}>{msg}</div>}

      {/* Filters */}
      <div className={styles.toolbar}>
        <select value={canal} onChange={(e) => setCanal(e.target.value)} className={styles.filterSelect}>
          <option value="">Todos los canales</option>
          <option value="web">Web</option>
          <option value="local">Local</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={styles.dateInput} />
        <span style={{ color: 'var(--gray)', alignSelf: 'center' }}>→</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={styles.dateInput} />
        <button className="btn btn-outline" onClick={loadSales}>Filtrar</button>
      </div>

      {loading ? (
        <p className="text-gray">Cargando...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Canal</th>
                <th>Cliente</th>
                <th>Forma pago</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className={styles.saleRow} onClick={() => setDetailSale(s)}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {new Date(s.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <span className={s.canal === 'local' ? styles.badgeLocal : styles.badgeWeb}>
                      {s.canal === 'local' ? '🏪 Local' : '🌐 Web'}
                    </span>
                  </td>
                  <td>{s.guest_nombre ?? '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.forma_pago ?? '—'}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(s.total)}</td>
                  <td>
                    <span className={s.estado === 'paid' ? styles.pill : styles.pillPend}>
                      {s.estado}
                    </span>
                  </td>
                  <td>
                    <button className={styles.btnDetail} onClick={(e) => { e.stopPropagation(); setDetailSale(s); }}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Sin ventas en el período seleccionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {detailSale && (
        <div className={styles.overlay} onClick={() => setDetailSale(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Detalle de venta</h2>
              <button className={styles.close} onClick={() => setDetailSale(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailMeta}>
                <div className={styles.detailMetaItem}>
                  <span>Fecha</span>
                  <strong>{new Date(detailSale.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
                <div className={styles.detailMetaItem}>
                  <span>Canal</span>
                  <strong>{detailSale.canal === 'local' ? 'Local' : 'Web'}</strong>
                </div>
                <div className={styles.detailMetaItem}>
                  <span>Cliente</span>
                  <strong>{detailSale.guest_nombre ?? '—'}</strong>
                </div>
                <div className={styles.detailMetaItem}>
                  <span>Forma de pago</span>
                  <strong style={{ textTransform: 'capitalize' }}>{detailSale.forma_pago ?? '—'}</strong>
                </div>
                <div className={styles.detailMetaItem}>
                  <span>Estado</span>
                  <strong>{detailSale.estado}</strong>
                </div>
              </div>

              <h3 style={{ fontSize: '0.9rem', margin: '1rem 0 0.5rem', color: 'var(--dark)' }}>Productos</h3>
              {(detailSale.productos ?? []).length > 0 ? (
                <table className={styles.detailTable}>
                  <thead>
                    <tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {detailSale.productos.map((p: Record<string, unknown>, i: number) => {
                      const pName = safeStr(p.nombre);
                      const pQty = safeNum(p.quantity, 1);
                      const pPrice = safeNum(p.precio);
                      return (
                        <tr key={i}>
                          <td>{pName}</td>
                          <td>{fmt(pPrice)}</td>
                          <td>{pQty}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(pPrice * pQty)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Sin detalle de productos</p>
              )}

              <div className={styles.detailTotal}>
                <span>Total</span>
                <strong>{fmt(detailSale.total)}</strong>
              </div>

              {detailSale.notas && (
                <div className={styles.detailNotas}>
                  <span>Notas:</span>
                  <p>{detailSale.notas}</p>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setDetailSale(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva venta local */}
      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Nueva venta local</h2>
              <button className={styles.close} onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <div className="form-group">
                  <label>Cliente (opcional)</label>
                  <input placeholder="Nombre del cliente" value={guestNombre} onChange={(e) => setGuestNombre(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Forma de pago</label>
                  <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="mp">MercadoPago</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Buscar y agregar productos</label>
                <div className={styles.searchWrap}>
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => { setProductQuery(e.target.value); setProductDropdownOpen(true); }}
                    onFocus={() => setProductDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setProductDropdownOpen(false), 200)}
                    placeholder="Escribir nombre del producto..."
                  />
                  {productDropdownOpen && productQuery.length > 0 && (
                    <ul className={styles.dropdownList}>
                      {products
                        .filter((p) => p.activo && `${p.nombre} ${p.kg ?? ''}`.toLowerCase().includes(productQuery.toLowerCase()))
                        .slice(0, 20)
                        .map((p) => (
                          <li key={p.id} className={styles.dropdownItem}
                            onMouseDown={() => {
                              addItem(p);
                              setProductQuery('');
                              setProductDropdownOpen(false);
                            }}
                          >
                            <span className={styles.dropdownName}>{p.nombre}{p.kg ? ` (${p.kg})` : ''}</span>
                            <span className={styles.dropdownPrice}>{fmt(p.precio_local ?? p.precio ?? 0)}</span>
                          </li>
                        ))}
                      {products.filter((p) => p.activo && `${p.nombre} ${p.kg ?? ''}`.toLowerCase().includes(productQuery.toLowerCase())).length === 0 && (
                        <li className={styles.dropdownEmpty}>Sin resultados</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {items.length > 0 && (
                <table className={styles.itemsTable}>
                  <thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th><th></th></tr></thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.nombre}</td>
                        <td>
                          <input
                            type="number" min={0}
                            value={item.precio}
                            className={styles.priceInput}
                            onChange={(e) => setItems((prev) => prev.map((x, j) => j === i ? { ...x, precio: Math.max(0, parseFloat(e.target.value) || 0) } : x))}
                            onWheel={(e) => e.currentTarget.blur()}
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td>
                          <input
                            type="number" min={1}
                            value={item.cantidad}
                            className={styles.qtyInput}
                            onChange={(e) => setItems((prev) => prev.map((x, j) => j === i ? { ...x, cantidad: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                            onWheel={(e) => e.currentTarget.blur()}
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td>{fmt(item.precio * item.cantidad)}</td>
                        <td><button className={styles.btnDel} onClick={() => removeItem(i)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className={styles.totalsRow}>
                <span>Subtotal: <strong>{fmt(subtotal)}</strong></span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Descuento: $
                  <input type="number" min={0} value={descuento} onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} className={styles.discountInput} />
                </label>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total: {fmt(total)}</span>
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label>Notas</label>
                <input placeholder="Observaciones..." value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !items.length}>
                {saving ? 'Guardando...' : `Registrar ${fmt(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
