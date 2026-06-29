import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import PetList from './PetList';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Mascotas Perdidas, Encontradas y Busca Hogar — Huellitas Petshop',
  description: 'Ayudanos a reencontrar a las mascotas con sus familias. Publicá avisos de mascotas perdidas, encontradas o que buscan un nuevo hogar.',
};

export default function MascotasPage() {
  return (
    <section className="section">
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Mascotas perdidas, encontradas y busca hogar</h1>
            <p className={styles.subtitle}>Ayudemos a reencontrar a las mascotas con sus familias o encontrarles un nuevo hogar</p>
          </div>
          <Link href="/mascotas/nuevo" className="btn btn-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Publicar aviso
          </Link>
        </div>

        <Suspense fallback={<div className={styles.loading}>Cargando avisos...</div>}>
          <PetList />
        </Suspense>
      </div>
    </section>
  );
}
