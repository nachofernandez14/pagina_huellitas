'use client';

import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';

/** Clears the cart once on mount — rendered only after a confirmed payment */
export default function CartClearer() {
  const { clearCart } = useCart();
  useEffect(() => {
    clearCart();
    sessionStorage.removeItem('mp_pending');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
