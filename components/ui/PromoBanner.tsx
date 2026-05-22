'use client';

import { useState } from 'react';
import styles from './PromoBanner.module.css';

const PET_TYPES = ['Perro', 'Gato', 'Otro'];

export default function PromoBanner() {
  const [form, setForm] = useState({
    petName: '',
    email: '',
    petType: '',
    breed: '',
    age: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.petType) return;
    setLoading(true);
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch {
      // silencioso — igual mostramos el mensaje de éxito
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

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
        <input
          className={styles.input}
          type="email"
          name="email"
          placeholder="Correo electrónico *"
          value={form.email}
          onChange={handleChange}
          required
          autoComplete="email"
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
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? '...' : 'Registrate'}
        </button>
      </form>
    </div>
  );
}
