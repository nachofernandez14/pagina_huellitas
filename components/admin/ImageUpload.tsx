'use client';

import Image from 'next/image';
import { DragEvent, useRef, useState } from 'react';
import styles from './ImageUpload.module.css';

const MAX_PX = 800;
const MAX_BYTES = 5 * 1024 * 1024;

function resizeImage(file: File): Promise<{ blob: Blob; ext: string }> {
  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(MAX_PX / img.naturalWidth, MAX_PX / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas no disponible'));
      if (!hasAlpha) {
        // Fill white background only for non-transparent formats
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      const mimeType = hasAlpha ? 'image/png' : 'image/jpeg';
      const quality = hasAlpha ? undefined : 0.85;
      canvas.toBlob(
        (blob) => blob ? resolve({ blob, ext: hasAlpha ? 'png' : 'jpg' }) : reject(new Error('Error al procesar imagen')),
        mimeType,
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')); };
    img.src = url;
  });
}

interface Props {
  currentImage?: string | null;
  onChange: (url: string) => void;
  onError: (msg: string) => void;
}

export default function ImageUpload({ currentImage, onChange, onError }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Soporta tanto URLs completas (Supabase Storage) como paths relativos
  const imageSrc = currentImage
    ? currentImage.startsWith('http') ? currentImage : `/images/${currentImage}`
    : null;

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      onError('❌ Solo se aceptan imágenes (JPG, PNG, WebP)');
      return;
    }
    if (file.size > MAX_BYTES) {
      onError('❌ La imagen supera los 5 MB');
      return;
    }
    setUploading(true);
    try {
      const { blob, ext } = await resizeImage(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, `.${ext}`);
      const form = new FormData();
      form.append('image', blob, safeName);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: form, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? 'Error al subir imagen');
      }
      const { url } = await res.json();
      onChange(url);
    } catch (e: unknown) {
      onError(`❌ ${e instanceof Error ? e.message : 'Error al subir imagen'}`);
    } finally {
      setUploading(false);
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className={styles.wrap}>
      {imageSrc && (
        <div className={styles.preview}>
          <Image
            src={imageSrc}
            alt="Vista previa"
            fill
            sizes="100px"
            style={{ objectFit: 'cover' }}
            unoptimized={imageSrc.startsWith('http')}
          />
        </div>
      )}

      <div
        className={`${styles.dropzone} ${dragOver ? styles.over : ''} ${uploading ? styles.uploading : ''}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Subir imagen de producto"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onInputChange}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <>
            <div className={styles.spinner} />
            <span>Subiendo imagen...</span>
          </>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>{imageSrc ? 'Reemplazar imagen' : 'Arrastrá o hacé clic para subir'}</span>
            <span className={styles.hint}>JPG, PNG, WebP · máx 5 MB · se ajusta a 800 px</span>
          </>
        )}
      </div>
    </div>
  );
}
