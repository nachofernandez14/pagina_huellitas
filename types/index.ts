// ============================================================
// HUELLITAS PETSHOP - Shared TypeScript Types
// Applied Rules: [CA], [DRY]
// ============================================================

export type ProductCategory = 'perros' | 'cachorros' | 'gatos' | 'gatitos' | 'granos' | 'accesorios';

export interface Product {
  id: string;
  nombre: string;
  categoria: ProductCategory;
  subcategoria?: string;
  precio: number | null;
  descuento?: number | null;
  promo_label?: string | null;
  kg?: string;
  stock: number;
  imagen?: string;
  activo: boolean;
  supplier_id?: string | null;
  precio_costo?: number | null;
  precio_local?: number | null;
  proteina?: string | null;
  kg_regalo?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  nombre: string;
  categoria: ProductCategory;
  precio: number;
  kg?: string;
  imagen?: string;
  quantity: number;
  promo_label?: string | null;
}

export interface Order {
  id: string;
  user_id?: string;
  guest_email?: string;
  guest_nombre?: string;
  guest_telefono?: string;
  guest_direccion?: string;
  tipo_entrega?: 'retiro' | 'envio';
  zona?: string;
  canal?: 'web' | 'local';
  forma_pago?: string;
  productos: CartItem[];
  total: number;
  estado: 'pending' | 'paid' | 'cancelled' | 'failed' | 'preparing' | 'ready' | 'shipped' | 'delivered';
  mp_preference_id?: string;
  mp_payment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  rol: 'cliente' | 'admin';
  created_at: string;
}

export interface GuestCheckoutData {
  nombre: string;
  email: string;
  telefono: string;
  tipoEntrega: 'retiro' | 'envio';
  zona?: string;
  direccion?: string;
}

// ============================================================
// ADMIN TYPES
// ============================================================

export interface Category {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  icono: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  cuit: string | null;
  direccion: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierOrder {
  id: string;
  supplier_id: string;
  fecha: string;
  estado: 'pendiente' | 'recibido_parcial' | 'recibido' | 'cancelado';
  total: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierOrderItem {
  id: string;
  supplier_order_id: string;
  product_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  fecha: string;
  monto: number;
  tipo: 'pago' | 'anticipo' | 'nota_credito' | 'otro';
  descripcion: string | null;
  comprobante: string | null;
}

export interface ExpenseCategory {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Expense {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  category_id: string | null;
  comprobante: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartContextValue {
  items: CartItem[];
  total: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
}
