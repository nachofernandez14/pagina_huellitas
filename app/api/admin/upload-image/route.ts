import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const BUCKET = 'productos';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/admin/upload-image  (multipart/form-data con campo "image")
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido' }, { status: 400 });
  }

  const file = form.get('image');
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });

  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: 'Imagen demasiado grande (máx 5 MB)' }, { status: 400 });

  if (!file.type.startsWith('image/'))
    return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });

  const ext = 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(filename, bytes, { contentType: 'image/jpeg', upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: publicUrl });
}
