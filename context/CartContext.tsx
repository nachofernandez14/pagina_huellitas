'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import type { CartContextValue, CartItem, Product } from '@/types';

/**
 * Parses an "NxM" promo label (e.g. "5x4", "3x2") and returns the
 * correct subtotal for a given quantity: groups of N are charged as M.
 */
export function calcItemSubtotal(
  precio: number,
  quantity: number,
  promo_label?: string | null,
): number {
  if (promo_label) {
    const m = promo_label.match(/^(\d+)[xX](\d+)$/);
    if (m) {
      const buy = parseInt(m[1], 10);
      const pay = parseInt(m[2], 10);
      if (pay < buy && buy > 0) {
        const groups = Math.floor(quantity / buy);
        const remainder = quantity % buy;
        return (groups * pay + remainder) * precio;
      }
    }
  }
  return precio * quantity;
}

// ── State & Reducer ───────────────────────────────────────────

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; items: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.id === action.product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      const newItem: CartItem = {
        id: action.product.id,
        nombre: action.product.nombre,
        categoria: action.product.categoria,
        precio: action.product.precio ?? 0,
        kg: action.product.kg,
        imagen: action.product.imagen,
        quantity: 1,
        promo_label: action.product.promo_label,
      };
      return { items: [...state.items, newItem] };
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter((i) => i.id !== action.productId) };
    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return { items: state.items.filter((i) => i.id !== action.productId) };
      }
      return {
        items: state.items.map((i) =>
          i.id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      };
    }
    case 'CLEAR':
      return { items: [] };
    case 'HYDRATE':
      return { items: action.items };
    default:
      return state;
  }
}

const STORAGE_KEY = 'huellitas_cart';

// ── Context ───────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items: CartItem[] = JSON.parse(stored);
        dispatch({ type: 'HYDRATE', items });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const addItem = useCallback(
    (product: Product) => dispatch({ type: 'ADD_ITEM', product }),
    []
  );
  const removeItem = useCallback(
    (productId: string) => dispatch({ type: 'REMOVE_ITEM', productId }),
    []
  );
  const updateQuantity = useCallback(
    (productId: string, quantity: number) =>
      dispatch({ type: 'UPDATE_QUANTITY', productId, quantity }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const total = state.items.reduce(
    (sum, i) => sum + calcItemSubtotal(i.precio, i.quantity, i.promo_label),
    0
  );
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items: state.items, total, addItem, removeItem, updateQuantity, clearCart, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
