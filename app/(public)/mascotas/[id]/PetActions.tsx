'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { LostFoundPet } from '@/types';
import ConfirmModal from '@/components/ui/ConfirmModal';
import styles from './page.module.css';

interface Props {
  pet: LostFoundPet;
  isOwner: boolean;
  isAdmin: boolean;
}

export default function PetActions({ pet, isOwner, isAdmin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<'resolve' | 'delete' | null>(null);

  const canAct = isOwner || isAdmin;

  const handleResolve = useCallback(async () => {
    setModal(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/pets/${pet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ status: 'resuelto' }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Error al actualizar');
        return;
      }
      router.refresh();
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [pet.id, router]);

  const handleDelete = useCallback(async () => {
    setModal(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/pets/${pet.id}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Error al eliminar');
        return;
      }
      router.push('/mascotas');
      router.refresh();
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [pet.id, router]);

  if (!canAct) return null;

  return (
    <>
      <div className={styles.actions}>
        {pet.status === 'activo' && (
          <button
            className="btn btn-outline"
            onClick={() => setModal('resolve')}
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Marcar como resuelto
          </button>
        )}
        <button
          className="btn btn-ghost"
          style={{ color: 'var(--error)' }}
          onClick={() => setModal('delete')}
          disabled={loading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          Eliminar
        </button>
      </div>

      <ConfirmModal
        open={modal === 'resolve'}
        title="Marcar como resuelto"
        message="¿Estás seguro de que querés marcar este aviso como resuelto?"
        confirmLabel="Sí, resolver"
        variant="primary"
        onConfirm={handleResolve}
        onCancel={() => setModal(null)}
      />

      <ConfirmModal
        open={modal === 'delete'}
        title="Eliminar aviso"
        message="¿Estás seguro de que querés eliminar este aviso? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setModal(null)}
      />
    </>
  );
}
