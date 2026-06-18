'use client';

import { useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import styles from '../auth.module.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const searchParams = useSearchParams();
  const resetOk = searchParams.get('resetOk') === '1';
  const confirmed = searchParams.get('confirmed') === '1';
  const registered = searchParams.get('registered') === '1';
  const verifyError = searchParams.get('error');
  const redirect = searchParams.get('redirect') || '/perfil';

  const EMAIL_MAX = 254;
  const PASS_MAX = 128;

  const onTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setError('');
  }, []);

  const handleResend = async () => {
    if (!email.trim() || resending || resent) return;
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setResent(true);
        setError('');
      }
    } catch {
      // Silencio
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailNotConfirmed(false);
    setResent(false);

    if (!turnstileToken) {
      setError('Completá la verificación de seguridad');
      return;
    }

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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, password, turnstileToken }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      if (data.emailNotConfirmed) {
        setEmailNotConfirmed(true);
        setError(data.error ?? 'Email no confirmado.');
      } else {
        setError(data.error ?? 'Error al iniciar sesión');
      }
      return;
    }

    // Hard redirect so the browser sends fresh auth cookies to the server
    window.location.href = redirect;
  };

  return (
    <div className={styles.page}>
      <div className={`card ${styles.box}`}>
        <h1 className={styles.title}>Ingresar</h1>
        <p className={styles.subtitle}>
          ¿No tenés cuenta? <Link href="/registro" className="text-green">Registrarse</Link>
        </p>

        {registered && (
          <div className={styles.success}>
            ¡Cuenta creada! Revisá tu casilla de correo para confirmar tu email antes de ingresar.
          </div>
        )}
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
        {verifyError === 'verificacion-invalida' && (
          <div className={styles.error}>
            El link de verificación es inválido o expiró. Solicitá uno nuevo.
          </div>
        )}
        {verifyError === 'verificacion-expirada' && (
          <div className={styles.error}>
            El link de verificación expiró. Solicitá uno nuevo.
          </div>
        )}
        {error && !emailNotConfirmed && <div className={styles.error}>{error}</div>}

        {emailNotConfirmed && (
          <div className={styles.error}>
            <p style={{ margin: '0 0 0.5rem' }}>{error}</p>
            {resent ? (
              <p style={{ margin: 0, color: 'var(--green-dark)', fontWeight: 600 }}>
                ¡Email reenviado! Revisá tu casilla de correo.
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Reenviando...' : 'Reenviar verificación'}
              </button>
            )}
          </div>
        )}

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
          <TurnstileWidget onVerify={onTurnstileVerify} />

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={loading || !turnstileToken}
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
