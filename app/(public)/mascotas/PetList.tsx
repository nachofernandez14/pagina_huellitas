'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PetCard from '@/components/pets/PetCard';
import type { LostFoundPet, PetType } from '@/types';
import styles from './page.module.css';

const TYPES: { value: PetType | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'perdida', label: 'Perdidas' },
  { value: 'encontrada', label: 'Encontradas' },
  { value: 'busca_hogar', label: 'Busca hogar' },
];

export default function PetList() {
  const [pets, setPets] = useState<LostFoundPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState<PetType | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (query.trim()) params.set('q', query.trim());
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/pets?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPets(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [type, query, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPets();
  }, [fetchPets]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.typeFilter}>
          {TYPES.map((t) => (
            <button
              key={t.value}
              className={`${styles.filterBtn} ${type === t.value ? styles.filterBtnActive : ''}`}
              onClick={() => { setType(t.value); setPage(1); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Buscar por nombre, zona..."
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={`${styles.skeleton} ${styles.skeletonImg}`} />
              <div className={styles.skeletonBody}>
                <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: '60%' }} />
                <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: '40%' }} />
                <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : pets.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay avisos publicados todavía.</p>
          <Link href="/mascotas/nuevo" className="btn btn-accent">Publicar primer aviso</Link>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {pets.map((pet) => <PetCard key={pet.id} pet={pet} />)}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className={styles.pageInfo}>
                Página {page} de {totalPages}
              </span>
              <button
                className="btn btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
