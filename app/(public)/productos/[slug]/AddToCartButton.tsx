'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/types';
import styles from './page.module.css';

interface Props {
  product: Product;
  outOfStock: boolean;
}

export default function AddToCartButton({ product, outOfStock }: Props) {
  const { addItem, updateQuantity, items } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    const existing = items.find((i) => i.id === product.id);
    addItem(product);
    if (qty > 1) {
      updateQuantity(product.id, (existing?.quantity ?? 0) + qty);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
      <div className={styles.qtyRow}>
        <button
          className={styles.qtyBtn}
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={outOfStock}
          aria-label="Disminuir cantidad"
        >
          −
        </button>
        <span className={styles.qtyVal}>{qty}</span>
        <button
          className={styles.qtyBtn}
          onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
          disabled={outOfStock || qty >= product.stock}
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>
      <button
        className={`btn btn-primary ${styles.addBtn}`}
        onClick={handleAdd}
        disabled={outOfStock}
      >
        {outOfStock ? 'Sin stock' : added ? '✓ Agregado!' : '+ Agregar al carrito'}
      </button>
    </>
  );
}
