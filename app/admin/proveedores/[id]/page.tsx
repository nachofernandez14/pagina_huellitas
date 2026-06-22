'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

interface Supplier { id: string; nombre: string; contacto: string | null; telefono: string | null; }
interface OrderItem { id: string; product_id: string | null; descripcion: string; cantidad: number; precio_unitario: number; subtotal: number; }
interface SupplierOrder { id: string; fecha: string; estado: string; total: number; notas: string | null; supplier_order_items: OrderItem[]; }
interface Payment { id: string; fecha: string; monto: number; tipo: string; descripcion: string | null; comprobante: string | null; }
interface SupplierProduct { id: string; nombre: string; kg: string | null; precio_costo: number | null; }

interface OrderLineItem { product_id: string | null; descripcion: string; cantidad: number; precio_unitario: number; }

// Cierra el overlay SOLO cuando el click EMPIEZA en el overlay (evita cerrar al seleccionar texto)
function useOverlayClose(onClose: () => void) {
  const downTarget = useRef<EventTarget | null>(null);
  return {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => { downTarget.current = e.target; },
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && downTarget.current === e.currentTarget) onClose();
      downTarget.current = null;
    },
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

const ESTADOS = ['pendiente', 'recibido_parcial', 'recibido', 'cancelado'];

export default function ProveedorDetail() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pedidos' | 'pagos'>('pedidos');
  const [msg, setMsg] = useState('');

  // New order modal
  const [orderModal, setOrderModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([{ product_id: null, descripcion: '', cantidad: 1, precio_unitario: 0 }]);
  const [lineQueries, setLineQueries] = useState<string[]>(['']);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [orderNotas, setOrderNotas] = useState('');
  const [orderFecha, setOrderFecha] = useState(new Date().toISOString().split('T')[0]);
  const [savingOrder, setSavingOrder] = useState(false);

  // New payment modal
  const [payModal, setPayModal] = useState(false);
  const [payMonto, setPayMonto] = useState('');
  const [payTipo, setPayTipo] = useState('pago');
  const [payDesc, setPayDesc] = useState('');
  const [payFecha, setPayFecha] = useState(new Date().toISOString().split('T')[0]);
  const [payComprobante, setPayComprobante] = useState<File | null>(null);
  const [payComprobantePreview, setPayComprobantePreview] = useState<string | null>(null);
  const [savingPay, setSavingPay] = useState(false);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/suppliers/${id}`);
    if (r.ok) {
      const d = await r.json();
      setSupplier(d.supplier);
      setOrders(d.orders);
      setPayments(d.payments);
      setSupplierProducts(d.products ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const addLine = () => {
    setOrderItems((prev) => [...prev, { product_id: null, descripcion: '', cantidad: 1, precio_unitario: 0 }]);
    setLineQueries((prev) => [...prev, '']);
  };
  const removeLine = (i: number) => {
    setOrderItems((prev) => prev.filter((_, j) => j !== i));
    setLineQueries((prev) => prev.filter((_, j) => j !== i));
  };
  const setLine = (i: number, k: keyof OrderLineItem, v: string | number | null) =>
    setOrderItems((prev) => prev.map((item, j) => j === i ? { ...item, [k]: v } : item));

  const selectProduct = (i: number, productId: string) => {
    if (!productId) {
      setOrderItems((prev) => prev.map((item, j) =>
        j === i ? { ...item, product_id: null, descripcion: '', precio_unitario: 0 } : item
      ));
      return;
    }
    const prod = supplierProducts.find((p) => p.id === productId);
    if (!prod) return;
    setOrderItems((prev) => prev.map((item, j) =>
      j === i
        ? { product_id: prod.id, descripcion: `${prod.nombre}${prod.kg ? ` ${prod.kg}` : ''}`, cantidad: item.cantidad, precio_unitario: prod.precio_costo ?? 0 }
        : item
    ));
  };

  const getPriceChange = (item: OrderLineItem) => {
    if (!item.product_id) return null;
    const prod = supplierProducts.find((p) => p.id === item.product_id);
    if (!prod || prod.precio_costo == null) return null;
    if (item.precio_unitario === prod.precio_costo) return null;
    return item.precio_unitario > prod.precio_costo ? 'mayor' : 'menor';
  };

  const orderTotal = orderItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const handleSaveOrder = async () => {
    if (orderItems.some((i) => !i.descripcion.trim())) { flash('❌ Completa la descripción de cada ítem'); return; }
    setSavingOrder(true);

    const isEditing = !!editingOrderId;
    const url = isEditing
      ? `/api/admin/suppliers/${id}/orders/${editingOrderId}`
      : `/api/admin/suppliers/${id}/orders`;
    const method = isEditing ? 'PATCH' : 'POST';

    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ items: orderItems, notas: orderNotas, fecha: orderFecha }),
    });
    setSavingOrder(false);
    if (r.ok) {
      const res = await r.json();
      const parts = [isEditing ? '✅ Pedido actualizado · Stock reajustado' : '✅ Pedido registrado como recibido · Stock actualizado'];
      if (res.priceChanges?.length > 0) {
        const msgs = res.priceChanges.map((pc: { descripcion: string; oldPrice: number; newPrice: number }) => {
          const dir = pc.newPrice > pc.oldPrice ? '⬆️ mayor' : '⬇️ menor';
          return `${pc.descripcion}: ${fmt(pc.oldPrice)} → ${fmt(pc.newPrice)} (${dir})`;
        });
        parts.push(`Precios: ${msgs.join(' · ')}`);
      }
      flash(parts.join(' · '));
      setEditingOrderId(null);
      setOrderModal(false);
      load();
    }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  const handleSavePayment = async () => {
    const monto = parseFloat(payMonto);
    if (!monto || monto <= 0) { flash('❌ Monto inválido'); return; }
    setSavingPay(true);

    let comprobanteUrl: string | null = null;
    if (payComprobante) {
      const form = new FormData();
      form.append('image', payComprobante);
      const uploadRes = await fetch('/api/admin/upload-image', { method: 'POST', body: form, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        comprobanteUrl = url;
      } else {
        const e = await uploadRes.json();
        flash(`❌ Error al subir comprobante: ${e.error}`);
        setSavingPay(false);
        return;
      }
    }

    const r = await fetch(`/api/admin/suppliers/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ monto, tipo: payTipo, descripcion: payDesc || null, fecha: payFecha, comprobante: comprobanteUrl }),
    });
    setSavingPay(false);
    if (r.ok) { flash('✅ Pago registrado'); setPayModal(false); setPayComprobante(null); setPayComprobantePreview(null); load(); }
    else { const e = await r.json(); flash(`❌ ${e.error}`); }
  };

  const updateEstado = async (orderId: string, estado: string) => {
    const r = await fetch(`/api/admin/supplier-orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ estado }),
    });
    if (r.ok) {
      const res = await r.json();
      if (res.priceChanges?.length > 0) {
        const msgs = res.priceChanges.map((pc: { descripcion: string; oldPrice: number; newPrice: number }) => {
          const dir = pc.newPrice > pc.oldPrice ? '⬆️ mayor' : '⬇️ menor';
          return `${pc.descripcion}: ${fmt(pc.oldPrice)} → ${fmt(pc.newPrice)} (${dir})`;
        });
        flash(`✅ Stock actualizado · Precios: ${msgs.join(' · ')}`);
      } else {
        flash('✅ Estado actualizado');
      }
    } else {
      const e = await r.json();
      flash(`❌ ${e.error}`);
    }
    load();
  };

  const totalCompras = orders.filter((o) => ['recibido', 'recibido_parcial'].includes(o.estado)).reduce((s, o) => s + Number(o.total), 0);
  const totalPagado = payments.reduce((s, p) => s + Number(p.monto), 0);

  // Overlay handlers - fix for text-selection bug
  const orderOverlay = useOverlayClose(() => { setEditingOrderId(null); setOrderModal(false); });
  const payOverlay = useOverlayClose(() => setPayModal(false));

  if (loading) return <p className="text-gray">Cargando...</p>;
  if (!supplier) return <p className="text-gray">Proveedor no encontrado.</p>;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <Link href="/admin/proveedores" className={styles.back}>← Proveedores</Link>
          <h1 className={styles.title}>{supplier.nombre}</h1>
          <div className={styles.meta}>
            {supplier.contacto && <span>👤 {supplier.contacto}</span>}
            {supplier.telefono && <span>📱 {supplier.telefono}</span>}
          </div>
        </div>
        <div className={styles.kpiRow}>
          <div className={styles.kpi}><span>Compras</span><strong>{fmt(totalCompras)}</strong></div>
          <div className={styles.kpi}><span>Pagado</span><strong>{fmt(totalPagado)}</strong></div>
          <div className={`${styles.kpi} ${totalCompras - totalPagado > 0 ? styles.kpiDebt : ''}`}>
            <span>Saldo deuda</span>
            <strong>{fmt(totalCompras - totalPagado)}</strong>
          </div>
        </div>
      </div>

      {msg && <div className={styles.toast}>{msg}</div>}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'pedidos' ? styles.tabActive : ''}`} onClick={() => setTab('pedidos')}>
          Pedidos ({orders.length})
        </button>
        <button className={`${styles.tab} ${tab === 'pagos' ? styles.tabActive : ''}`} onClick={() => setTab('pagos')}>
          Pagos ({payments.length})
        </button>
        <div style={{ flex: 1 }} />
        {tab === 'pedidos' && (
          <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => { setEditingOrderId(null); setOrderItems([{ product_id: null, descripcion: '', cantidad: 1, precio_unitario: 0 }]); setLineQueries(['']); setOpenDropdownIdx(null); setOrderNotas(''); setOrderFecha(new Date().toISOString().split('T')[0]); setOrderModal(true); }}>
            + Nuevo pedido
          </button>
        )}
        {tab === 'pagos' && (
          <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => { setPayMonto(''); setPayDesc(''); setPayTipo('pago'); setPayComprobante(null); setPayComprobantePreview(null); setPayModal(true); }}>
            + Registrar pago
          </button>
        )}
      </div>

      {/* Orders tab */}
      {tab === 'pedidos' && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead><tr><th>Fecha</th><th>Estado</th><th>Ítems</th><th>Total</th><th>Notas</th><th></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                  <td>
                    <select
                      value={o.estado}
                      className={styles.estadoSelect}
                      onChange={(e) => updateEstado(o.id, e.target.value)}
                    >
                      {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <ul className={styles.itemList}>
                      {o.supplier_order_items.map((it) => (
                        <li key={it.id}>{it.descripcion} × {it.cantidad} = {fmt(it.subtotal)}</li>
                      ))}
                    </ul>
                  </td>
                  <td style={{ fontWeight: 700 }}>{fmt(o.total)}</td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{o.notas ?? '—'}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => {
                      setEditingOrderId(o.id);
                      setOrderItems(o.supplier_order_items.map((it) => ({
                        product_id: it.product_id ?? null,
                        descripcion: it.descripcion,
                        cantidad: it.cantidad,
                        precio_unitario: it.precio_unitario,
                      })));
                      setLineQueries(o.supplier_order_items.map(() => ''));
                      setOpenDropdownIdx(null);
                      setOrderNotas(o.notas ?? '');
                      setOrderFecha(o.fecha);
                      setOrderModal(true);
                    }}>✏️</button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Sin pedidos aún</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments tab */}
      {tab === 'pagos' && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Descripción</th><th>Comprobante</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.tipo}</td>
                  <td style={{ fontWeight: 700, color: 'var(--green-dark)' }}>{fmt(p.monto)}</td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>{p.descripcion ?? '—'}</td>
                  <td>
                    {p.comprobante
                      ? <a href={p.comprobante} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>📎 Ver</a>
                      : '—'}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem' }}>Sin pagos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* New order modal */}
      {orderModal && (
        <div className={styles.overlay} {...orderOverlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><h2>{editingOrderId ? 'Editar pedido' : 'Nuevo pedido'} — {supplier.nombre}</h2><button className={styles.close} onClick={() => { setEditingOrderId(null); setOrderModal(false); }}>✕</button></div>
            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <div className="form-group"><label>Fecha</label><input type="date" value={orderFecha} onChange={(e) => setOrderFecha(e.target.value)} /></div>
                <div className="form-group"><label>Notas</label><input value={orderNotas} onChange={(e) => setOrderNotas(e.target.value)} /></div>
              </div>
              <table className={styles.lineTable}>
                <thead><tr><th>Producto</th><th>Descripción</th><th>Cant.</th><th>Precio costo</th><th>Subtotal</th><th></th></tr></thead>
                <tbody>
                  {orderItems.map((item, i) => (
                    <tr key={i}>
                      <td className={styles.searchWrap}>
                        <input
                          type="text"
                          value={lineQueries[i] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLineQueries((prev) => prev.map((q, j) => j === i ? v : q));
                            setOpenDropdownIdx(i);
                            if (!v) selectProduct(i, '');
                          }}
                          onFocus={() => setOpenDropdownIdx(i)}
                          onBlur={() => setTimeout(() => setOpenDropdownIdx(null), 200)}
                          placeholder="Buscar producto..."
                          className={styles.lineInput}
                        />
                        {openDropdownIdx === i && (
                          <ul className={styles.dropdownList}>
                            {supplierProducts
                              .filter((p) => {
                                const q = (lineQueries[i] ?? '').toLowerCase();
                                return !q || `${p.nombre} ${p.kg ?? ''}`.toLowerCase().includes(q);
                              })
                              .map((p) => (
                                <li key={p.id} className={styles.dropdownItem}
                                  onMouseDown={() => {
                                    selectProduct(i, p.id);
                                    setLineQueries((prev) => prev.map((q, j) => j === i ? `${p.nombre}${p.kg ? ` ${p.kg}` : ''}` : q));
                                    setOpenDropdownIdx(null);
                                  }}
                                >
                                  <span className={styles.dropdownName}>{p.nombre}{p.kg ? ` ${p.kg}` : ''}</span>
                                  {p.precio_costo != null && <span className={styles.dropdownPrice}>{fmt(p.precio_costo)}</span>}
                                </li>
                              ))}
                            {supplierProducts.filter((p) => { const q = (lineQueries[i] ?? '').toLowerCase(); return !q || `${p.nombre} ${p.kg ?? ''}`.toLowerCase().includes(q); }).length === 0 && (
                              <li className={styles.dropdownEmpty}>Sin resultados</li>
                            )}
                          </ul>
                        )}
                      </td>
                      <td>
                        {item.product_id
                          ? <span className={styles.lineDesc}>{item.descripcion}</span>
                          : <input value={item.descripcion} onChange={(e) => setLine(i, 'descripcion', e.target.value)} placeholder="Descripción..." className={styles.lineInput} />}
                      </td>
                      <td><input type="number" min={1} step="0.001" value={item.cantidad} onChange={(e) => setLine(i, 'cantidad', parseFloat(e.target.value) || 0)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} className={styles.numInput} /></td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" min={0} value={item.precio_unitario} onChange={(e) => setLine(i, 'precio_unitario', parseFloat(e.target.value) || 0)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} className={styles.numInput} />
                        {item.product_id && getPriceChange(item) === 'mayor' && <span title="Precio mayor al actual" style={{ color: 'var(--danger, #e53e3e)', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>⬆️</span>}
                        {item.product_id && getPriceChange(item) === 'menor' && <span title="Precio menor al actual" style={{ color: 'var(--success, #38a169)', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>⬇️</span>}
                      </td>
                      <td>{fmt(item.cantidad * item.precio_unitario)}</td>
                      <td>{orderItems.length > 1 && <button className={styles.btnDel} onClick={() => removeLine(i)}>✕</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-ghost" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }} onClick={addLine}>+ Agregar ítem</button>
              <p style={{ textAlign: 'right', fontWeight: 700, marginTop: '0.75rem' }}>Total: {fmt(orderTotal)}</p>
              {supplierProducts.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.5rem' }}>
                  💡 Asigná productos a este proveedor desde el panel de Productos para seleccionarlos aquí.
                </p>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => { setEditingOrderId(null); setOrderModal(false); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveOrder} disabled={savingOrder}>{savingOrder ? 'Guardando...' : 'Guardar pedido'}</button>
            </div>
          </div>
        </div>
      )}

      {/* New payment modal */}
      {payModal && (
        <div className={styles.overlay} {...payOverlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><h2>Registrar pago — {supplier.nombre}</h2><button className={styles.close} onClick={() => setPayModal(false)}>✕</button></div>
            <div className={styles.modalBody}>
              <div className={styles.grid2}>
                <div className="form-group"><label>Fecha</label><input type="date" value={payFecha} onChange={(e) => setPayFecha(e.target.value)} /></div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={payTipo} onChange={(e) => setPayTipo(e.target.value)}>
                    <option value="pago">Pago</option>
                    <option value="anticipo">Anticipo</option>
                    <option value="nota_credito">Nota de crédito</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="form-group"><label>Monto ($) *</label><input type="number" min={0} value={payMonto} onChange={(e) => setPayMonto(e.target.value)} onWheel={(e) => e.currentTarget.blur()} onFocus={(e) => e.target.select()} placeholder="0" /></div>
                <div className="form-group"><label>Descripción</label><input value={payDesc} onChange={(e) => setPayDesc(e.target.value)} /></div>
                <div className="form-group">
                  <label>Comprobante (boleta/factura)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setPayComprobante(file);
                      if (file && file.type.startsWith('image/')) {
                        setPayComprobantePreview(URL.createObjectURL(file));
                      } else {
                        setPayComprobantePreview(null);
                      }
                    }}
                  />
                  {payComprobantePreview && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img src={payComprobantePreview} alt="Vista previa" style={{ maxHeight: 120, borderRadius: 6, border: '1px solid var(--border)' }} />
                    </div>
                  )}
                  {payComprobante && !payComprobante.type.startsWith('image/') && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>📄 {payComprobante.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setPayModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSavePayment} disabled={savingPay}>{savingPay ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
