'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import styles from './ProductSearch.module.css';

export default function ProductSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? '';
    const categoria = params.get('categoria') ?? '';
    const url = new URLSearchParams();
    if (q) url.set('q', q);
    if (categoria) url.set('categoria', categoria);
    router.push(`/productos?${url.toString()}`);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search">
      <input
        ref={inputRef}
        defaultValue={params.get('q') ?? ''}
        placeholder="Buscar productos..."
        className={styles.input}
        aria-label="Buscar productos"
      />
      <button type="submit" className={styles.btn} aria-label="Buscar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </form>
  );
}
