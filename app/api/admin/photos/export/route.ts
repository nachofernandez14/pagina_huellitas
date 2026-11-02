import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { requireAdmin } from '@/lib/auth';
import type { Product } from '@/types';

const BUCKET = 'productos';

/** Extracts the object path inside the "productos" bucket from a public URL
 *  or from a bare bucket path (stored by the old CSV import). */
function extractPath(url: string): string | null {
  const bare = url.split('?')[0];
  try {
    const u = new URL(url);
    const marker = '/storage/v1/object/';
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    let rest = u.pathname.slice(i + marker.length); // "public/productos/<path>"
    rest = rest.replace(/^public\//, '').replace(/^authenticated\//, '');
    const b = rest.indexOf(`${BUCKET}/`);
    if (b === -1) return null;
    return decodeURIComponent(rest.slice(b + BUCKET.length + 1));
  } catch {
    // Not a valid URL → try as bare bucket path like "perroadulto/dog.webp"
    if (/\.(jpe?g|png|webp|gif|avif)$/i.test(bare)) {
      try {
        return decodeURIComponent(bare);
      } catch {
        return bare;
      }
    }
    return null;
  }
}

function extOf(url: string): string {
  const m = url.split('?')[0].match(/\.(\w{2,5})$/);
  return m ? m[1].toLowerCase() : 'jpg';
}

// GET /api/admin/photos/export — downloads all product photos from the
// "productos" bucket as a single ZIP, one file per product (slug-named).
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const products: Product[] = [];
  const PAGE = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await admin
      .from('products')
      .select('id, slug, nombre, imagen')
      .order('nombre')
      .range(offset, offset + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    products.push(...(data as Product[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  // One file per unique image URL (kg variants of the same product share a photo)
  const seen = new Map<string, number>();
  const items: { path: string; filename: string }[] = [];
  for (const p of products) {
    if (!p.imagen) continue;
    const path = extractPath(p.imagen);
    if (!path) continue;
    const base = p.slug || p.id;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    items.push({
      path,
      filename: n > 1 ? `${base}-${n}.${extOf(p.imagen)}` : `${base}.${extOf(p.imagen)}`,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: 'No hay fotos para exportar' }, { status: 404 });
  }

  const zip = new JSZip();
  let failed = 0;
  for (const item of items) {
    try {
      const { data, error } = await admin.storage.from(BUCKET).download(item.path);
      if (error || !data) {
        failed++;
        continue;
      }
      zip.file(item.filename, Buffer.from(await data.arrayBuffer()));
    } catch {
      failed++;
    }
  }

  if (failed === items.length) {
    return NextResponse.json({ error: 'Error al descargar las fotos' }, { status: 500 });
  }

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(content), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="fotos_productos_${stamp}.zip"`,
      'Cache-Control': 'no-store',
      ...(failed > 0 ? { 'X-Export-Warnings': `${failed} fallidas` } : {}),
    },
  });
}
