import { createClient } from '@/lib/supabase/server';
import type { Product, ProductCategory } from '@/types';

export interface ProductFilters {
  categoria?: ProductCategory;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const supabase = await createClient();
  const { categoria, search, limit = 50, offset = 0 } = filters;

  let query = supabase
    .from('products')
    .select('*')
    .eq('activo', true)
    .order('nombre')
    .range(offset, offset + limit - 1);

  if (categoria) {
    query = query.eq('categoria', categoria);
  }
  if (search) {
    const words = search.trim().split(/\s+/).filter(Boolean);
    for (const w of words) {
      query = query.ilike('nombre', `%${w}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as Product[]) ?? [];
}

export async function getTopOffers(limit = 9): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('activo', true)
    .gt('descuento', 0)
    .order('descuento', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data as Product[]) ?? [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Product;
}

/** Returns active products with the same name (siblings) excluding the given id. */
export async function getProductSiblings(nombre: string, excludeId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('nombre', nombre)
    .eq('activo', true)
    .neq('id', excludeId)
    .order('kg');

  if (error) return [];
  return (data as Product[]) ?? [];
}
