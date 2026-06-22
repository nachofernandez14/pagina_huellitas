'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { LostFoundPet } from '@/types';
import styles from './page.module.css';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminMascotasPage() {
  const [pets, setPets] = useState<LostFoundPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'activo' | 'resuelto'>('todos');

  async function fetchPets() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: filter, limit: '50' });
      const res = await fetch(`/api/pets?${params}`);
      const data = await res.json();
      setPets(data.data ?? []);
    } catch {
      setPets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPets();
  }, [filter]);

  async function handleResolve(id: string) {
    if (!confirm('¿Marcar como resuelto?')) return;
    const res = await fetch(`/api/pets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ status: 'resuelto' }),
    });
    if (res.ok) fetchPets();
    else alert((await res.json()).error);
  }

  async function handleReactivate(id: string) {
    if (!confirm('¿Reactivar este aviso?')) return;
    const res = await fetch(`/api/pets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ status: 'activo' }),
    });
    if (res.ok) fetchPets();
    else alert((await res.json()).error);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este aviso definitivamente?')) return;
    const res = await fetch(`/api/pets/${id}`, {
      method: 'DELETE',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (res.ok) fetchPets();
    else alert((await res.json()).error);
  }

  const activeCount = pets.filter((p) => p.status === 'activo').length;
  const resolvedCount = pets.filter((p) => p.status === 'resuelto').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mascotas Perdidas/Encontradas</h1>
          <p className={styles.subtitle}>
            {pets.length} avisos · {activeCount} activos · {resolvedCount} resueltos
          </p>
        </div>
      </div>

      <div className={styles.filters}>
        {(['todos', 'activo', 'resuelto'] as const).map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Resueltos'}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Cargando...</p>
      ) : pets.length === 0 ? (
        <p style={{ color: '#64748b' }}>No hay avisos que coincidan con el filtro.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Zona</th>
                <th>Usuario</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pets.map((pet) => (
                <tr key={pet.id} className={pet.status === 'resuelto' ? styles.rowResolved : ''}>
                  <td>
                    {pet.image_url ? (
                      <Image
                        src={pet.image_url}
                        alt=""
                        width={48}
                        height={36}
                        style={{ objectFit: 'cover', borderRadius: '4px' }}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.noImg}>—</div>
                    )}
                  </td>
                  <td className={styles.cellName}>{pet.name}</td>
                  <td>
                    <span className={`${styles.badge} ${pet.type === 'perdida' ? styles.badgeLost : styles.badgeFound}`}>
                      {pet.type === 'perdida' ? 'Perdida' : 'Encontrada'}
                    </span>
                  </td>
                  <td>{pet.zone}</td>
                  <td className={styles.cellSub}>{pet.profile?.nombre ?? '—'}</td>
                  <td className={styles.cellSub}>{pet.profile?.telefono ?? '—'}</td>
                  <td>
                    <span className={`${styles.status} ${pet.status === 'activo' ? styles.statusActive : styles.statusResolved}`}>
                      {pet.status}
                    </span>
                  </td>
                  <td className={styles.cellDate}>{fmtDate(pet.created_at)}</td>
                  <td>
                    <div className={styles.actions}>
                      {pet.status === 'activo' ? (
                        <button className={styles.btnResolve} onClick={() => handleResolve(pet.id)} title="Marcar como resuelto">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      ) : (
                        <button className={styles.btnReactivate} onClick={() => handleReactivate(pet.id)} title="Reactivar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                        </button>
                      )}
                      <button className={styles.btnDelete} onClick={() => handleDelete(pet.id)} title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
