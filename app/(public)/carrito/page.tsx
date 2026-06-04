'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { calcItemSubtotal } from '@/context/CartContext';
import styles from './page.module.css';

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}

export default function CarritoPage() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="section" style={{ textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <div style={{ marginBottom: '1rem', color: 'var(--gray-light)' }}>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.56l1.65-8.44H6"/>
            </svg>
          </div>
          <h1 className="section-title">Tu carrito está vacío</h1>
          <p className="text-gray" style={{ marginBottom: '2rem' }}>
            Agregá productos para comenzar tu pedido.
          </p>
          <Link href="/productos" className="btn btn-primary">Ver productos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className={styles.header}>
          <h1 className="section-title" style={{ margin: 0 }}>Tu carrito</h1>
          <button className="btn btn-ghost" style={{ color: 'var(--error)', fontSize: '0.85rem' }} onClick={clearCart}>
            Vaciar carrito
          </button>
        </div>

        <div className={styles.layout}>
          {/* Items list */}
          <div className={styles.items}>
            {items.map((item) => (
              <div key={item.id} className={`card ${styles.item}`}>
                <div className={styles.imgWrap}>
                  <Image
                    src={item.imagen ? (item.imagen.startsWith('http') ? item.imagen : `/images/${item.imagen}`) : '/images/no-image.svg'}
                    alt={item.nombre}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="80px"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/no-image.svg';
                    }}
                  />
                </div>
                <div className={styles.info}>
                  <p className={styles.nombre}>{item.nombre}</p>
                  {item.kg && <p className={styles.kg}>{item.kg} kg</p>}
                  <p className={styles.price}>{formatPrice(item.precio)}</p>
                </div>
                <div className={styles.itemActions}>
                  <div className={styles.controls}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Disminuir"
                    >−</button>
                    <span className={styles.qty}>{item.quantity}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Aumentar"
                    >+</button>
                  </div>
                  <div className={styles.subtotal}>
                    {formatPrice(calcItemSubtotal(item.precio, item.quantity, item.promo_label))}
                    {(() => {
                      const savings = item.precio * item.quantity - calcItemSubtotal(item.precio, item.quantity, item.promo_label);
                      if (savings <= 0) return null;
                      return (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#2e7d32', fontWeight: 700, marginTop: '0.15rem' }}>
                          {item.promo_label} · - {formatPrice(savings)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeItem(item.id)}
                  aria-label="Eliminar"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className={`card ${styles.summary}`}>
            <h2 className={styles.summaryTitle}>Resumen</h2>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className="text-gray" style={{ fontSize: '0.85rem' }}>Envío</span>
              <span className="text-gray" style={{ fontSize: '0.85rem' }}>A coordinar</span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--gray-light)', margin: '0.75rem 0' }} />
            <div className={`${styles.summaryRow} ${styles.total}`}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Link href="/checkout" className="btn btn-primary w-full" style={{ marginTop: '1.25rem', justifyContent: 'center' }}>
              Ir a pagar
            </Link>
            <Link href="/productos" className="btn btn-ghost w-full" style={{ marginTop: '0.5rem', justifyContent: 'center', fontSize: '0.875rem' }}>
              ← Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
