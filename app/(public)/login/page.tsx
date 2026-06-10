'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from '../auth.module.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const resetOk = searchParams.get('resetOk') === '1';
  const confirmed = searchParams.get('confirmed') === '1';
  const redirect = searchParams.get('redirect') || '/perfil';

  const EMAIL_MAX = 254;
  const PASS_MAX = 128;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail || trimmedEmail.length > EMAIL_MAX) {
      setError('Email inválido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Email inválido');
      return;
    }
    if (!password || password.length > PASS_MAX) {
      setError('Contraseña inválida');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    setLoading(false);
    if (authError) {
      if (
        authError.message.toLowerCase().includes('not confirmed') ||
        authError.message.toLowerCase().includes('confirm') ||
        authError.message.toLowerCase().includes('email')
      ) {
        setError('Tu email aún no está confirmado. Revisá tu bandeja de entrada o contactanos para activar la cuenta.');
      } else if (
        authError.message.toLowerCase().includes('invalid') ||
        authError.message.toLowerCase().includes('credentials')
      ) {
        setError('Email o contraseña incorrectos.');
      } else {
        setError(authError.message);
      }
    } else {
      // Hard redirect so the browser sends fresh auth cookies to the server
      window.location.href = redirect;
    }
  };

  return (
    <div className={styles.page}>
      <div className={`card ${styles.box}`}>
        <h1 className={styles.title}>Ingresar</h1>
        <p className={styles.subtitle}>
          ¿No tenés cuenta? <Link href="/registro" className="text-green">Registrarse</Link>
        </p>

        {confirmed && (
          <div className={styles.success}>
            ¡Cuenta confirmada! Ya podés ingresar.
          </div>
        )}
        {resetOk && (
          <div className={styles.success}>
            Contraseña actualizada correctamente. Ya podés iniciar sesión.
          </div>
        )}
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
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div style={{ textAlign: 'right', marginTop: '0.3rem' }}>
              <Link href="/recuperar-contrasena" className={styles.link} style={{ fontSize: '0.8rem' }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className={styles.divider}>¿Preferís comprar sin registrarte?</div>
        <Link href="/checkout" className="btn btn-ghost w-full" style={{ justifyContent: 'center' }}>
          Continuar como invitado →
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
