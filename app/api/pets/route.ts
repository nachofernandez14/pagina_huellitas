import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUserId } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { PetType, LostFoundPet } from '@/types';

const MAX_ACTIVE_PETS_PER_USER = 3;

// GET /api/pets — list pets (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as PetType | null;
  const q = searchParams.get('q');
  const status = searchParams.get('status') ?? 'activo';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '12', 10) || 12));
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from('lost_found_pets')
    .select('*', { count: 'exact' });

  // Public listing: only active unless searching own or admin
  const userId = await getCurrentUserId();
  if (!userId || status === 'activo') {
    query = query.eq('status', 'activo');
  } else if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', userId)
      .single();
    if (profile?.rol === 'admin') {
      if (status !== 'todos') {
        query = query.eq('status', status);
      }
    } else {
      query = query.eq('status', status);
    }
  }

  if (type && ['perdida', 'encontrada'].includes(type)) {
    query = query.eq('type', type);
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,zone.ilike.%${q}%,description.ilike.%${q}%`);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const petsWithProfile = await attachProfiles(data as LostFoundPet[]);

  return NextResponse.json({ data: petsWithProfile, total: count ?? 0, page, limit });
}

// POST /api/pets — create a pet post (auth required)
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Debés iniciar sesión para publicar un aviso' }, { status: 401 });

  // Rate limit: max 10 per hour per IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`pets:create:${ip}`, 10, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Intentalo más tarde.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const type = body.type as string;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const zone = typeof body.zone === 'string' ? body.zone.trim() : '';
  const image_url = typeof body.image_url === 'string' ? body.image_url.trim() : '';

  // Validation
  const errors: string[] = [];
  if (!['perdida', 'encontrada'].includes(type)) errors.push('El tipo debe ser "perdida" o "encontrada"');
  if (!name || name.length < 1) errors.push('El nombre de la mascota es obligatorio');
  if (name.length > 100) errors.push('El nombre no puede superar los 100 caracteres');
  if (!description || description.length < 10) errors.push('La descripción debe tener al menos 10 caracteres');
  if (description.length > 500) errors.push('La descripción no puede superar los 500 caracteres');
  if (!zone || zone.length < 1) errors.push('La zona es obligatoria');
  if (zone.length > 200) errors.push('La zona no puede superar los 200 caracteres');
  if (image_url && image_url.length > 500) errors.push('La URL de la imagen es muy larga');

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('. ') }, { status: 400 });
  }

  // Check max active pets per user
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from('lost_found_pets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'activo');

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  if (count !== null && count >= MAX_ACTIVE_PETS_PER_USER) {
    return NextResponse.json({
      error: `Ya tenés ${MAX_ACTIVE_PETS_PER_USER} avisos activos. Resolvé o eliminá uno antes de crear otro.`
    }, { status: 400 });
  }

  // Duplicate check: mismo usuario, mismo nombre, mismo tipo, activo
  const { data: existing } = await supabase
    .from('lost_found_pets')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('name', name)
    .eq('type', type)
    .eq('status', 'activo')
    .maybeSingle();

  if (existing) {
    const fecha = new Date(existing.created_at).toLocaleDateString('es-AR');
    return NextResponse.json({
      error: `Ya tenés un aviso ${type === 'perdida' ? 'de' : 'de'} "${name}" como "${type === 'perdida' ? 'Perdida' : 'Encontrada'}" (publicado el ${fecha}). Marcá el anterior como resuelto antes de crear uno nuevo.`
    }, { status: 409 });
  }

  const { data, error: insertError } = await supabase
    .from('lost_found_pets')
    .insert({
      user_id: userId,
      type,
      name,
      description,
      zone,
      image_url: image_url || null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ data: data as LostFoundPet }, { status: 201 });
}

async function attachProfiles(pets: LostFoundPet[]): Promise<LostFoundPet[]> {
  if (pets.length === 0) return [];

  const admin = createAdminClient();
  const userIds = [...new Set(pets.map(p => p.user_id))];
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, nombre, telefono')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.id, { nombre: p.nombre, telefono: p.telefono }]) ?? []);

  return pets.map(p => ({
    ...p,
    profile: profileMap.get(p.user_id) ?? undefined,
  }));
}
