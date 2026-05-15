'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import styles from './CartDrawer.module.css';

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const { items, total, removeItem, updateQuantity, itemCount } = useCart();

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      )}

      {/* Drawer */}
      <aside
        className={`${styles.drawer} ${open ? styles.open : ''}`}
        aria-label="Carrito de compras"
      >
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.titleIcon}>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <h2 className={styles.title}>Mi carrito</h2>
            {itemCount > 0 && <span className={styles.titleBadge} aria-live="polite" aria-atomic="true">{itemCount}</span>}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-light)', marginBottom: '0.5rem' }}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                <path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <p style={{ fontWeight: 600, color: 'var(--dark)', marginBottom: '0.25rem' }}>Tu carrito está vacío</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>Agregá productos para comenzar</p>
              <Link href="/productos" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={onClose}>
                Ver productos
              </Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <div className={styles.itemImg}>
                    <Image
                      src={item.imagen ? `/images/${item.imagen}` : '/images/no-image.svg'}
                      alt={item.nombre}
                      fill
                      sizes="64px"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>

                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.nombre}</p>
                    {item.kg && <span className={styles.itemKg}>{item.kg}</span>}
                    <div className={styles.itemBottom}>
                      <p className={styles.itemPrice}>
                        {formatPrice(item.precio * item.quantity)}
                      </p>
                      <div className={styles.itemControls}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className={styles.qtyBtn}
                          aria-label="Restar"
                        >−</button>
                        <span className={styles.qty}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className={styles.qtyBtn}
                          aria-label="Sumar"
                        >+</button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className={styles.removeBtn}
                          aria-label="Eliminar"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>{itemCount} {itemCount === 1 ? 'producto' : 'productos'}</span>
              <div>
                <span className={styles.totalNote}>Total</span>
                <strong className={styles.totalAmount}>{formatPrice(total)}</strong>
              </div>
            </div>
            <Link href="/checkout" className="btn btn-accent w-full" onClick={onClose}>
              Ir a pagar →
            </Link>
            <Link href="/carrito" className="btn btn-outline w-full" onClick={onClose}>
              Ver carrito completo
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
