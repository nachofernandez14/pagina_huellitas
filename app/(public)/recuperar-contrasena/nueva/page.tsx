'use client';

import { useState, useEffect, useRef } from 'react';
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
  const readyRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const markReady = () => {
      readyRef.current = true;
      setReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') markReady();
    });

    // Caso 1: token en el hash (#access_token=...&type=recovery)
    const hash = window.location.hash.substring(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') ?? '';
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: err }) => {
            if (!err) {
              // Limpiar el hash de la URL para que no quede visible
              window.history.replaceState(null, '', window.location.pathname);
              markReady();
            }
          });
      }
    }

    // Caso 2: código PKCE en query param (?code=...)
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error: err }) => { if (!err) markReady(); });
    }

    // Fallback: sesión ya activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    const timeout = setTimeout(() => {
      if (!readyRef.current) setInvalidLink(true);
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

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
