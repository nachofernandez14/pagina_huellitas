import type { Metadata } from 'next';
import Link from 'next/link';
import PetForm from '@/components/pets/PetForm';
import { getCurrentUserId } from '@/lib/auth';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Publicar aviso — Mascotas Perdidas, Encontradas y Busca Hogar — Huellitas Petshop',
  description: 'Publicá un aviso de mascota perdida, encontrada o que busca un nuevo hogar en Mendoza.',
};

export default async function NuevoAvisoPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <section className="section">
        <div className="container">
          <div className={styles.wrap}>
            <div className={styles.authRequired}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <h2 className={styles.authTitle}>Necesitás tener una cuenta</h2>
              <p className={styles.authDesc}>
                Para publicar avisos de mascotas perdidas, encontradas o que buscan hogar tenés que iniciar sesión o registrarte. Es rápido y gratis.
              </p>
              <div className={styles.authActions}>
                <Link href="/login" className="btn btn-primary">Iniciar sesión</Link>
                <Link href="/registro" className="btn btn-outline">Crear cuenta</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className={styles.wrap}>
          <h1 className={styles.title}>Publicar aviso</h1>
          <p className={styles.subtitle}>
            Completá el formulario para publicar una mascota perdida, encontrada o que busca hogar.
            Recordá que podés tener hasta 3 avisos activos.
          </p>
          <PetForm />
        </div>
      </div>
    </section>
  );
}
