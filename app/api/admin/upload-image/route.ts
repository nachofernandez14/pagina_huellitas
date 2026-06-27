import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const BUCKET = 'productos';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MAGIC_BYTES: Record<string, { bytes: number[]; ext: string; mime: string }> = {
  jpeg: { bytes: [0xFF, 0xD8, 0xFF], ext: 'jpg', mime: 'image/jpeg' },
  png:  { bytes: [0x89, 0x50, 0x4E, 0x47], ext: 'png', mime: 'image/png' },
  webp: { bytes: [0x52, 0x49, 0x46, 0x46], ext: 'webp', mime: 'image/webp' },
  gif:  { bytes: [0x47, 0x49, 0x46, 0x38], ext: 'gif', mime: 'image/gif' },
};

function detectImageFormat(buffer: ArrayBuffer): { ext: string; mime: string } | null {
  const header = new Uint8Array(buffer, 0, 4);
  for (const fmt of Object.values(MAGIC_BYTES)) {
    if (fmt.bytes.every((b, i) => header[i] === b)) {
      return { ext: fmt.ext, mime: fmt.mime };
    }
  }
  return null;
}

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

  const bytes = await file.arrayBuffer();

  const format = detectImageFormat(bytes);
  if (!format) {
    return NextResponse.json({ error: 'El archivo debe ser una imagen válida (JPG, PNG, WebP o GIF)' }, { status: 400 });
  }

  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${format.ext}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(filename, bytes, { contentType: format.mime, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: publicUrl });
}
