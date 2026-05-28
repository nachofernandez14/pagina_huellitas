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
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button
      className={`btn btn-primary ${styles.addBtn}`}
      onClick={handleAdd}
      disabled={outOfStock}
    >
      {outOfStock
        ? 'Sin stock'
        : added
        ? '✓ Agregado'
        : '+ Agregar al carrito'}
    </button>
  );
}
