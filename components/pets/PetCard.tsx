'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { LostFoundPet } from '@/types';
import styles from './PetCard.module.css';

interface Props {
  pet: LostFoundPet;
}

export default function PetCard({ pet }: Props) {
  const isLost = pet.type === 'perdida';

  return (
    <Link href={`/mascotas/${pet.id}`} className={styles.card}>
      <div className={styles.imgWrap}>
        {pet.image_url ? (
          <Image
            src={pet.image_url}
            alt={pet.name}
            fill
            sizes="(max-width: 600px) 100vw, 300px"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <div className={styles.placeholder}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        )}
        <span className={`${styles.badge} ${isLost ? styles.badgeLost : styles.badgeFound}`}>
          {isLost ? 'Perdida' : 'Encontrada'}
        </span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{pet.name || 'Sin nombre'}</h3>
        <p className={styles.zone}>{pet.zone}</p>
        <p className={styles.desc}>{pet.description}</p>
        <span className={styles.date}>
          {new Date(pet.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </Link>
  );
}
