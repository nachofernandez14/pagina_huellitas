'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './PetForm.module.css';

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

interface FormData {
  type: '' | 'perdida' | 'encontrada';
  name: string;
  description: string;
  zone: string;
  image_url: string;
}

interface FormErrors {
  type?: string;
  name?: string;
  description?: string;
  zone?: string;
  image?: string;
  general?: string;
}

const INITIAL_FORM: FormData = {
  type: '',
  name: '',
  description: '',
  zone: '',
  image_url: '',
};

export default function PetForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!form.type) errs.type = 'Seleccioná si está perdida o fue encontrada';
    if (!form.name.trim()) errs.name = 'El nombre de la mascota es obligatorio';
    else if (form.name.trim().length > 100) errs.name = 'Máximo 100 caracteres';
    if (!form.description.trim()) errs.description = 'La descripción es obligatoria';
    else if (form.description.trim().length < 10) errs.description = 'Mínimo 10 caracteres';
    else if (form.description.trim().length > 500) errs.description = 'Máximo 500 caracteres';
    if (!form.zone.trim()) errs.zone = 'La zona es obligatoria';
    else if (form.zone.trim().length > 200) errs.zone = 'Máximo 200 caracteres';
    return errs;
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Solo se aceptan imágenes (JPG, PNG, WebP)' }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrors((prev) => ({ ...prev, image: 'La imagen supera los 5 MB' }));
      return;
    }

    setUploading(true);
    setErrors((prev) => ({ ...prev, image: undefined }));

    try {
      const { blob, ext } = await resizeImage(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, `.${ext}`);
      const formData = new FormData();
      formData.append('image', blob, safeName);
      const res = await fetch('/api/pets/upload-image', { method: 'POST', body: formData, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Error al subir imagen');
      }
      const { url } = await res.json();
      setForm((prev) => ({ ...prev, image_url: url }));
    } catch (e: unknown) {
      setErrors((prev) => ({ ...prev, image: e instanceof Error ? e.message : 'Error al subir imagen' }));
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setErrors({});
    setCreatedId(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          type: form.type,
          name: form.name.trim(),
          description: form.description.trim(),
          zone: form.zone.trim(),
          image_url: form.image_url || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.error ?? 'Error al crear el aviso' });
        return;
      }

      setCreatedId(data.data.id);
      setForm(INITIAL_FORM);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setErrors({ general: 'Error de conexión. Intentalo de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (createdId) {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 className={styles.successTitle}>¡Aviso publicado!</h2>
        <p className={styles.successDesc}>Tu aviso ya está visible en la sección de mascotas perdidas y encontradas.</p>
        <div className={styles.successActions}>
          <button type="button" className="btn btn-primary" onClick={() => { const id = createdId; resetForm(); router.push(`/mascotas/${id}`); }}>Ver aviso</button>
          <button type="button" className="btn btn-outline" onClick={resetForm}>Publicar otro</button>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {errors.general && (
        <div className={styles.generalError}>{errors.general}</div>
      )}

      {/* Type selector */}
      <fieldset className={styles.fieldGroup}>
        <legend className={styles.label}>Tipo de aviso *</legend>
        <div className={styles.typeGrid}>
          {(['perdida', 'encontrada'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.typeBtn} ${form.type === t ? styles.typeBtnActive : ''} ${t === 'perdida' ? styles.typeLost : styles.typeFound}`}
              onClick={() => setForm((prev) => ({ ...prev, type: t }))}
            >
              <span className={styles.typeIcon}>
                {t === 'perdida' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M16 16l-4-4-4 4"/><path d="M12 12v7"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                )}
              </span>
              <span>{t === 'perdida' ? 'Perdida' : 'Encontrada'}</span>
            </button>
          ))}
        </div>
        {errors.type && <p className={styles.fieldError}>{errors.type}</p>}
      </fieldset>

      {/* Name */}
      <div className="form-group">
        <label htmlFor="pet-name">Nombre de la mascota *</label>
        <input
          id="pet-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ej: Luna, Max, etc."
          maxLength={100}
        />
        {errors.name && <p className="form-error">{errors.name}</p>}
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="pet-desc">Descripción *</label>
        <textarea
          id="pet-desc"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describí la mascota, señas particulares, color, tamaño, collar, etc."
          rows={4}
          maxLength={500}
        />
        <span className={styles.charCount}>{form.description.length}/500</span>
        {errors.description && <p className="form-error">{errors.description}</p>}
      </div>

      {/* Zone */}
      <div className="form-group">
        <label htmlFor="pet-zone">Zona *</label>
        <input
          id="pet-zone"
          type="text"
          value={form.zone}
          onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value }))}
          placeholder="Ej: Rodeo de la Cruz, Guaymallén"
          maxLength={200}
        />
        {errors.zone && <p className="form-error">{errors.zone}</p>}
      </div>

      {/* Image */}
      <div className="form-group">
        <label>Foto (opcional)</label>
        <div className={styles.imageWrap}>
          {form.image_url ? (
            <div className={styles.previewWrap}>
              <Image
                src={form.image_url}
                alt="Foto de la mascota"
                width={200}
                height={150}
                style={{ objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                unoptimized
              />
              <button
                type="button"
                className={styles.removeImg}
                onClick={() => setForm((prev) => ({ ...prev, image_url: '' }))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <div
              className={styles.uploadZone}
              onClick={() => !uploading && inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            >
              {uploading ? (
                <span>Subiendo imagen...</span>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span>Subir foto</span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>
        {errors.image && <p className="form-error">{errors.image}</p>}
      </div>

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={submitting || uploading}
      >
        {submitting ? 'Publicando...' : 'Publicar aviso'}
      </button>
    </form>
  );
}
