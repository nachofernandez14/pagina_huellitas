'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './PromoBanner.module.css';

const PET_TYPES = ['Perro', 'Gato', 'Otro'];
const STORAGE_KEY = 'huellitas_promo_requested';

export default function PromoBanner() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState({ petName: '', petType: '', breed: '', age: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthLoading(false);
    });
    if (localStorage.getItem(STORAGE_KEY)) setAlreadyRequested(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !form.petType) return;
    setLoading(true);
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ ...form, email: userEmail }),
      });
    } catch {
      // silencioso — igual mostramos el mensaje de éxito
    } finally {
      setLoading(false);
      localStorage.setItem(STORAGE_KEY, '1');
      setSubmitted(true);
    }
  };

  // Don't flash anything while checking auth
  if (authLoading) return null;

  // Not logged in → push them to register
  if (!userEmail) {
    return (
      <div className={styles.banner}>
        <p className={styles.promo}>
          Creá tu cuenta hoy y accedé a un cupón de{' '}
          <strong className={styles.highlight}>$5.000 OFF</strong>{' '}
          en compras mayores a $80.000.{' '}
          <Link href="/registro" className={styles.ctaLink}>¡Registrarme ahora!</Link>
        </p>
      </div>
    );
  }

  if (alreadyRequested && !submitted) {
    return (
      <div className={styles.banner}>
        <p className={styles.successMsg}>
          🎁 Ya solicitaste tu cupón de <strong>$5.000 OFF</strong>. Revisá tu email y usálo al finalizar tu compra.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.banner}>
        <p className={styles.successMsg}>
          🎉 ¡Listo! Revisá tu email para recibir tu cupón de <strong>$5.000</strong> en compras mayores a $80.000.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.banner}>
      <p className={styles.promo}>
        ¡Completá tus datos y recibí tu cupón de{' '}
        <strong className={styles.highlight}>$5.000 OFF</strong> en compras mayores a{' '}
        <strong className={styles.highlight}>$80.000</strong>!
      </p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <input
          className={styles.input}
          type="text"
          name="petName"
          placeholder="Nombre de tu mascota"
          value={form.petName}
          onChange={handleChange}
          autoComplete="off"
        />
        <select
          className={styles.input}
          name="petType"
          value={form.petType}
          onChange={handleChange}
          required
        >
          <option value="" disabled>Tu mascota *</option>
          {PET_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          className={styles.input}
          type="text"
          name="breed"
          placeholder="Raza"
          value={form.breed}
          onChange={handleChange}
          autoComplete="off"
        />
        <input
          className={styles.input}
          type="number"
          name="age"
          placeholder="Edad (años)"
          value={form.age}
          onChange={handleChange}
          min={0}
          max={30}
        />
        <button className={styles.btn} type="submit" disabled={loading || !form.petType}>
          {loading ? '...' : 'Obtener cupón'}
        </button>
      </form>
    </div>
  );
}
