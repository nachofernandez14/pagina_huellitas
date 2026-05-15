'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from '../../auth.module.css';

export default function NuevaContrasenaPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Supabase detects the recovery token from the URL hash automatically
    // and fires PASSWORD_RECOVERY when the session is ready
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Fallback: if already has a session with recovery type
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // If after 4 seconds there's still no recovery event, the link is invalid/expired
    const timeout = setTimeout(() => {
      setInvalidLink((prev) => {
        if (!prev) return true; // only set if not already ready
        return prev;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Once ready, cancel the invalid-link timeout logic
  useEffect(() => {
    if (ready) setInvalidLink(false);
  }, [ready]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      // Sign out so user logs in fresh with new password
      await supabase.auth.signOut();
      router.push('/login?resetOk=1');
    }
  };

  if (!ready && !invalidLink) {
    return (
      <div className={styles.page}>
        <div className={`card ${styles.box}`} style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--gray)' }}>Verificando el link…</p>
        </div>
      </div>
    );
  }

  if (invalidLink && !ready) {
    return (
      <div className={styles.page}>
        <div className={`card ${styles.box}`} style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem' }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h1 className={styles.title} style={{ fontSize: '1.35rem' }}>Link inválido o expirado</h1>
          <p className={styles.subtitle}>El link de recuperación ya no es válido. Podés solicitar uno nuevo.</p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/recuperar-contrasena" className="btn btn-primary">Solicitar nuevo link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`card ${styles.box}`}>
        <h1 className={styles.title}>Nueva contraseña</h1>
        <p className={styles.subtitle}>Elegí una contraseña segura para tu cuenta.</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label htmlFor="password">Nueva contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Repetir contraseña</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              placeholder="Repetí la contraseña"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
