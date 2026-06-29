import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LostFoundPet } from '@/types';

export async function getActivePets(limit = 3): Promise<LostFoundPet[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('lost_found_pets')
    .select('*')
    .eq('status', 'activo')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as LostFoundPet[];
}

export async function getPetById(id: string): Promise<LostFoundPet | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('lost_found_pets')
    .select('*, profiles(nombre, telefono)')
    .eq('id', id)
    .single();

  if (!data) return null;

  return data as LostFoundPet;
}

export async function getAllPetsAdmin(): Promise<LostFoundPet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lost_found_pets')
    .select('*')
    .order('created_at', { ascending: false });

  if (!data) return [];

  const userIds = [...new Set(data.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nombre, telefono')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.id, { nombre: p.nombre, telefono: p.telefono }]) ?? []);

  return (data as LostFoundPet[]).map(p => ({
    ...p,
    profile: profileMap.get(p.user_id) ?? undefined,
  }));
}
