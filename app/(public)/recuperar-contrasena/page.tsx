'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../auth.module.css';

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const EMAIL_MAX = 254;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail || trimmedEmail.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Email inválido');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ email: trimmedEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Error al enviar el email');
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className={styles.page}>
        <div className={`card ${styles.box}`}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h1 className={styles.title}>Revisá tu email</h1>
          <p className={styles.subtitle} style={{ textAlign: 'center' }}>
            Si <strong>{email}</strong> tiene una cuenta, vas a recibir un link para restablecer tu contraseña.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--gray)', textAlign: 'center', marginTop: '1rem' }}>
            No olvides revisar la carpeta de spam.
          </p>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link href="/login" className="btn btn-ghost">← Volver al inicio de sesión</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`card ${styles.box}`}>
        <h1 className={styles.title}>Recuperar contraseña</h1>
        <p className={styles.subtitle}>
          Ingresá tu email y te mandamos un link para crear una nueva contraseña.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@email.com"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar link de recuperación'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/login" className={styles.link}>← Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
