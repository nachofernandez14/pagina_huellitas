import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUserId } from '@/lib/auth';
import type { LostFoundPet } from '@/types';

// GET /api/pets/[id] — get single pet detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: petData, error } = await supabase
    .from('lost_found_pets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !petData) return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('nombre, telefono')
    .eq('id', petData.user_id)
    .single();

  const pet = { ...petData, profile: profile ?? undefined } as LostFoundPet;

  // Only show contact info if active or if the viewer is the owner or admin
  if (pet.status !== 'activo') {
    const userId = await getCurrentUserId();
    if (userId !== pet.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', userId)
        .single();
      if (!profile || profile.rol !== 'admin') {
        pet.profile = undefined;
      }
    }
  }

  return NextResponse.json({ data: pet });
}

// PATCH /api/pets/[id] — update pet (owner or admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await req.json();

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Check ownership or admin
  const { data: pet, error: fetchError } = await supabase
    .from('lost_found_pets')
    .select('user_id')
    .eq('id', id)
    .single();

  if (fetchError || !pet) {
    return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', userId)
    .single();

  const isOwner = pet.user_id === userId;
  const isAdmin = profile?.rol === 'admin';

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'No tenés permiso para modificar este aviso' }, { status: 403 });
  }

  const allowedFields: Record<string, unknown> = {};

  // Owners can update these
  if (isOwner) {
    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (name.length < 1 || name.length > 100) {
        return NextResponse.json({ error: 'El nombre debe tener entre 1 y 100 caracteres' }, { status: 400 });
      }
      allowedFields.name = name;
    }
    if (typeof body.description === 'string') {
      const desc = body.description.trim();
      if (desc.length < 10 || desc.length > 500) {
        return NextResponse.json({ error: 'La descripción debe tener entre 10 y 500 caracteres' }, { status: 400 });
      }
      allowedFields.description = desc;
    }
    if (typeof body.zone === 'string') {
      const zone = body.zone.trim();
      if (zone.length < 1 || zone.length > 200) {
        return NextResponse.json({ error: 'La zona debe tener entre 1 y 200 caracteres' }, { status: 400 });
      }
      allowedFields.zone = zone;
    }
    if (typeof body.image_url === 'string') {
      allowedFields.image_url = body.image_url || null;
    }
  }

  // Both owners and admins can change status to 'resuelto'
  if (typeof body.status === 'string' && body.status === 'resuelto') {
    allowedFields.status = 'resuelto';
  }

  // Only admin can reactivate
  if (isAdmin && typeof body.status === 'string' && body.status === 'activo') {
    allowedFields.status = 'activo';
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos para actualizar' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('lost_found_pets')
    .update(allowedFields)
    .eq('id', id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ data: updated });
}

// DELETE /api/pets/[id] — delete pet (owner or admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: pet, error: fetchError } = await supabase
    .from('lost_found_pets')
    .select('user_id, image_url')
    .eq('id', id)
    .single();

  if (fetchError || !pet) {
    return NextResponse.json({ error: 'Aviso no encontrado' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', userId)
    .single();

  const isOwner = pet.user_id === userId;
  const isAdmin = profile?.rol === 'admin';

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'No tenés permiso para eliminar este aviso' }, { status: 403 });
  }

  // Clean up image from storage if exists
  if (pet.image_url) {
    try {
      const adminClient = createAdminClient();
      const url = new URL(pet.image_url);
      const pathParts = url.pathname.split('/');
      const storagePath = pathParts.slice(pathParts.indexOf('mascotas') + 1).join('/');
      if (storagePath) {
        await adminClient.storage.from('mascotas').remove([storagePath]);
      }
    } catch { /* ignore storage errors */ }
  }

  const { error: deleteError } = await supabase
    .from('lost_found_pets')
    .delete()
    .eq('id', id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
