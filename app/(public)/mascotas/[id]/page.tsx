import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/auth';
import PetActions from './PetActions';
import type { LostFoundPet } from '@/types';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('lost_found_pets')
    .select('name, type, description')
    .eq('id', id)
    .single();

  if (!data) return { title: 'Aviso no encontrado' };

  const prefix = data.type === 'perdida' ? 'Mascota Perdida' : 'Mascota Encontrada';
  return {
    title: `${prefix}: ${data.name} — Huellitas Petshop`,
    description: data.description.slice(0, 160),
  };
}

export default async function PetDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pet, error } = await supabase
    .from('lost_found_pets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !pet) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, telefono')
    .eq('id', pet.user_id)
    .single();

  const petWithProfile = { ...pet, profile: profile ?? undefined } as LostFoundPet;

  const userId = await getCurrentUserId();
  const isOwner = userId === pet.user_id;

  let isAdmin = false;
  if (userId) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', userId)
      .single();
    isAdmin = userProfile?.rol === 'admin';
  }

  const showContact = pet.status === 'activo' || isOwner || isAdmin;

  const isLost = pet.type === 'perdida';

  return (
    <section className="section">
      <div className="container">
        <Link href="/mascotas" className={styles.back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Volver a avisos
        </Link>

        <div className={styles.layout}>
          <div className={styles.imageCol}>
            {pet.image_url ? (
              <Image
                src={pet.image_url}
                alt={pet.name}
                width={600}
                height={450}
                style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 'var(--radius)' }}
                unoptimized
                priority
              />
            ) : (
              <div className={styles.noImage}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <p>Sin foto</p>
              </div>
            )}
          </div>

          <div className={styles.infoCol}>
            <div className={styles.badgeWrap}>
              <span className={`${styles.badge} ${isLost ? styles.badgeLost : styles.badgeFound}`}>
                {isLost ? 'Perdida' : 'Encontrada'}
              </span>
              {pet.status === 'resuelto' && (
                <span className={`${styles.badge} ${styles.badgeResolved}`}>Resuelto</span>
              )}
            </div>

            <h1 className={styles.name}>{pet.name}</h1>

            <div className={styles.detailRow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{pet.zone}</span>
            </div>

            <div className={styles.detailRow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Publicado {new Date(pet.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <div className={styles.divider} />

            <h2 className={styles.sectionTitle}>Descripción</h2>
            <p className={styles.description}>{pet.description}</p>

            {showContact && petWithProfile.profile && (
              <>
                <div className={styles.divider} />
                <h2 className={styles.sectionTitle}>Contacto</h2>
                <div className={styles.contactCard}>
                  {petWithProfile.profile.nombre && (
                    <div className={styles.contactRow}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <span>{petWithProfile.profile.nombre}</span>
                    </div>
                  )}
                  {petWithProfile.profile.telefono && (
                    <a href={`https://wa.me/54${petWithProfile.profile.telefono}`} target="_blank" rel="noopener noreferrer" className={styles.contactRow}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                      <span>{petWithProfile.profile.telefono}</span>
                    </a>
                  )}
                </div>
              </>
            )}

            <PetActions pet={petWithProfile} isOwner={isOwner} isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </section>
  );
}
