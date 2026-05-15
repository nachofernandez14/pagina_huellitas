'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import type { GuestCheckoutData } from '@/types';
import styles from './page.module.css';

const ZONAS = [
  { value: 'rodeo', label: 'Rodeo de la Cruz' },
  { value: 'corralitos', label: 'Corralitos' },
  { value: 'km8', label: 'KM 8' },
  { value: 'primavera', label: 'Primavera' },
];

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [mode, setMode] = useState<'guest' | 'login'>('guest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loggedUser, setLoggedUser] = useState<{ email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setLoggedUser({ email: session.user.email ?? '' });
      setAuthChecked(true);
    });
  }, []);

  // Guest form state
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'envio' | ''>('');
  const [zona, setZona] = useState('');
  const [direccion, setDireccion] = useState('');
  const [metodoPago, setMetodoPago] = useState<'mp' | 'efectivo' | ''>('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  if (items.length === 0) {
    return (
      <div className="section" style={{ textAlign: 'center' }}>
        <div className="container">
          <h1 className="section-title">Tu carrito está vacío</h1>
          <Link href="/productos" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Ver productos
          </Link>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      await proceedToPayment();
    }
  };

  const handleLoggedInCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tipoEntrega) {
      setError('Selecciona un tipo de entrega');
      return;
    }
    if (tipoEntrega === 'envio' && !zona) {
      setError('Selecciona una zona de envio');
      return;
    }
    if (tipoEntrega === 'envio' && !direccion.trim()) {
      setError('Ingresa tu direccion');
      return;
    }
    if (!metodoPago) {
      setError('Seleccioná un método de pago');
      return;
    }
    const delivery = {
      tipoEntrega,
      zona: tipoEntrega === 'envio' ? zona : undefined,
      direccion: tipoEntrega === 'envio' ? direccion : undefined,
    };
    if (metodoPago === 'efectivo') {
      await proceedCashOrder(undefined, delivery);
    } else {
      await proceedToPayment(undefined, delivery);
    }
  };

  const handleGuestCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre || !email || !telefono) {
      setError('Completa todos los campos de contacto');
      return;
    }
    if (!tipoEntrega) {
      setError('Seleccioná un tipo de entrega');
      return;
    }
    if (tipoEntrega === 'envio' && !zona) {
      setError('Seleccioná una zona de envío');
      return;
    }
    if (tipoEntrega === 'envio' && !direccion.trim()) {
      setError('Ingresá tu dirección');
      return;
    }
    if (!metodoPago) {
      setError('Seleccioná un método de pago');
      return;
    }

    const guestData: GuestCheckoutData = {
      nombre,
      email,
      telefono,
      tipoEntrega,
      zona: tipoEntrega === 'envio' ? zona : undefined,
      direccion: tipoEntrega === 'envio' ? direccion : undefined,
    };

    if (metodoPago === 'efectivo') {
      await proceedCashOrder(guestData);
    } else {
      await proceedToPayment(guestData);
    }
  };

  const proceedToPayment = async (guestData?: GuestCheckoutData, delivery?: { tipoEntrega: 'retiro' | 'envio'; zona?: string; direccion?: string }) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total, guest: guestData, delivery }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al procesar el pago');
      }

      const { init_point } = await res.json();
      clearCart();
      window.location.href = init_point;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setLoading(false);
    }
  };

  const proceedCashOrder = async (guestData?: GuestCheckoutData, delivery?: { tipoEntrega: 'retiro' | 'envio'; zona?: string; direccion?: string }) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/cash-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total, guest: guestData, delivery }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al crear el pedido');
      }
      const { orderId } = await res.json();
      clearCart();
      router.push(`/checkout/success?order=${orderId}&status=cash&entrega=${tipoEntrega}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setLoading(false);
    }
  };

  const zonaLabel = ZONAS.find((z) => z.value === zona)?.label ?? '';

  return (
    <div className="section">
      <div className="container">
        <h1 className="section-title">Finalizar compra</h1>

        {/* ── Stepper ── */}
        <div className={styles.stepper} aria-label="Pasos del proceso de compra">
          <div className={`${styles.stepItem} ${styles.stepDone}`}>
            <span className={styles.stepCircle}>✓</span>
            <span className={styles.stepLabel}>Carrito</span>
          </div>
          <div className={`${styles.stepLine} ${styles.stepDone}`} />
          <div className={`${styles.stepItem} ${styles.stepActive}`}>
            <span className={styles.stepCircle}>2</span>
            <span className={styles.stepLabel}>Datos</span>
          </div>
          <div className={styles.stepLine} />
          <div className={styles.stepItem}>
            <span className={styles.stepCircle}>3</span>
            <span className={styles.stepLabel}>Pago</span>
          </div>
        </div>

        <div className={styles.layout}>
          {/* ── Left: form ─────────────────────────────────────── */}
          <div className={styles.formSide}>

            {/* Loading auth state */}
            {!authChecked ? (
              <div className={styles.authLoading}>Verificando sesion...</div>
            ) : loggedUser ? (
              /* ── Usuario logueado ── */
              <form onSubmit={handleLoggedInCheckout} className={styles.form}>
                <div className={styles.authBanner}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Comprando como <strong>{loggedUser.email}</strong></span>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                {/* ── Entrega ── */}
                <h3 className={styles.formTitle}>Entrega</h3>

                <div className={styles.entregaOpciones}>
                  <button
                    type="button"
                    className={`${styles.entregaBtn} ${tipoEntrega === 'retiro' ? styles.entregaBtnActive : ''}`}
                    onClick={() => { setTipoEntrega('retiro'); setZona(''); setDireccion(''); setMetodoPago(''); }}
                  >
                    <span className={styles.entregaIcon}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </span>
                    <span className={styles.entregaLabel}>Retiro en sucursal</span>
                    <span className={styles.entregaSub}>Sin costo adicional</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.entregaBtn} ${tipoEntrega === 'envio' ? styles.entregaBtnActive : ''}`}
                    onClick={() => { setTipoEntrega('envio'); setMetodoPago(''); }}
                  >
                    <span className={styles.entregaIcon}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                      </svg>
                    </span>
                    <span className={styles.entregaLabel}>Envio a domicilio</span>
                    <span className={styles.entregaSub}>Zonas disponibles</span>
                  </button>
                </div>

                {/* ── Método de pago ── */}
                {tipoEntrega === 'retiro' && (
                  <div className={styles.pagoSection}>
                    <h3 className={styles.formTitle} style={{ marginTop: '1.5rem' }}>Método de pago</h3>
                    <div className={styles.entregaOpciones}>
                      <button type="button" className={`${styles.entregaBtn} ${metodoPago === 'mp' ? styles.entregaBtnActive : ''}`} onClick={() => setMetodoPago('mp')}>
                        <span className={styles.entregaIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span>
                        <span className={styles.entregaLabel}>Mercado Pago</span>
                        <span className={styles.entregaSub}>Tarjeta / transferencia</span>
                      </button>
                      <button type="button" className={`${styles.entregaBtn} ${metodoPago === 'efectivo' ? styles.entregaBtnActive : ''}`} onClick={() => setMetodoPago('efectivo')}>
                        <span className={styles.entregaIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg></span>
                        <span className={styles.entregaLabel}>Efectivo en local</span>
                        <span className={styles.entregaSub}>Pagás al retirar</span>
                      </button>
                    </div>
                  </div>
                )}

                {tipoEntrega === 'envio' && (
                  <div className={styles.zonaSection}>
                    <label className={styles.zonaLabel}>Selecciona tu zona *</label>
                    <div className={styles.zonaOpciones}>
                      {ZONAS.map((z) => (
                        <button
                          key={z.value}
                          type="button"
                          className={`${styles.zonaBtn} ${zona === z.value ? styles.zonaBtnActive : ''}`}
                          onClick={() => { setZona(z.value); setDireccion(''); }}
                        >
                          {z.label}
                        </button>
                      ))}
                    </div>
                    {zona && (
                      <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label htmlFor="direccion">Direccion en {zonaLabel} *</label>
                        <input
                          id="direccion"
                          type="text"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder={`Tu calle y numero en ${zonaLabel}`}
                          required
                          autoComplete="street-address"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Método de pago para envio — aparece luego de zona+dirección */}
                {tipoEntrega === 'envio' && zona && direccion.trim() && (
                  <div className={styles.pagoSection}>
                    <h3 className={styles.formTitle} style={{ marginTop: '1.5rem' }}>Método de pago</h3>
                    <div className={styles.entregaOpciones}>
                      <button type="button" className={`${styles.entregaBtn} ${metodoPago === 'mp' ? styles.entregaBtnActive : ''}`} onClick={() => setMetodoPago('mp')}>
                        <span className={styles.entregaIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span>
                        <span className={styles.entregaLabel}>Mercado Pago</span>
                        <span className={styles.entregaSub}>Tarjeta / transferencia</span>
                      </button>
                      <button type="button" className={`${styles.entregaBtn} ${metodoPago === 'efectivo' ? styles.entregaBtnActive : ''}`} onClick={() => setMetodoPago('efectivo')}>
                        <span className={styles.entregaIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg></span>
                        <span className={styles.entregaLabel}>Efectivo al recibir</span>
                        <span className={styles.entregaSub}>Pagás cuando te lo entregamos</span>
                      </button>
                    </div>
                  </div>
                )}

                {((tipoEntrega === 'envio' && zona && direccion) || tipoEntrega === 'retiro') && metodoPago ? (
                  <button
                    type="submit"
                    className={`btn w-full ${metodoPago === 'efectivo' ? 'btn-primary' : 'btn-accent'}`}
                    style={{ padding: '0.875rem', fontSize: '1rem', marginTop: '1.25rem' }}
                    disabled={loading}
                  >
                    {loading ? 'Procesando...' : metodoPago === 'efectivo' ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/>
                        </svg>
                        Confirmar pedido — pago en efectivo
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                        Ir a pagar con Mercado Pago
                      </span>
                    )}
                  </button>
                ) : null}
              </form>
            ) : (
              /* ── Guest / Login tabs ── */
              <>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${mode === 'guest' ? styles.tabActive : ''}`}
                    onClick={() => setMode('guest')}
                  >
                    Comprar sin cuenta
                  </button>
                  <button
                    className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
                    onClick={() => setMode('login')}
                  >
                    Ingresar con mi cuenta
                  </button>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                {mode === 'guest' ? (
                  <form onSubmit={handleGuestCheckout} className={styles.form}>

                    {/* ── Datos de contacto ── */}
                    <h3 className={styles.formTitle}>Tus datos de contacto</h3>

                    <div className="form-group">
                      <label htmlFor="nombre">Nombre completo *</label>
                      <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Juan Garcia"
                        required
                        autoComplete="name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="telefono">Telefono *</label>
                      <input
                        id="telefono"
                        type="tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="+54 9 261 000-0000"
                        required
                        autoComplete="tel"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email *</label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="juan@email.com"
                        required
                        autoComplete="email"
                      />
                    </div>

                    {/* ── Entrega ── */}
                    <h3 className={styles.formTitle} style={{ marginTop: '1.5rem' }}>Entrega</h3>

                    <div className={styles.entregaOpciones}>
                      <button
                        type="button"
                        className={`${styles.entregaBtn} ${tipoEntrega === 'retiro' ? styles.entregaBtnActive : ''}`}
                        onClick={() => { setTipoEntrega('retiro'); setZona(''); setDireccion(''); setMetodoPago(''); }}
                      >
                        <span className={styles.entregaIcon}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                        </span>
                        <span className={styles.entregaLabel}>Retiro en sucursal</span>
                        <span className={styles.entregaSub}>Sin costo adicional</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.entregaBtn} ${tipoEntrega === 'envio' ? styles.entregaBtnActive : ''}`}
                        onClick={() => { setTipoEntrega('envio'); setMetodoPago(''); }}
                      >
                        <span className={styles.entregaIcon}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                          </svg>
                        </span>
                        <span className={styles.entregaLabel}>Envio a domicilio</span>
                        <span className={styles.entregaSub}>Zonas disponibles</span>
                      </button>
                    </div>

                    {/* ── Método de pago (solo retiro) ── */}
                    {tipoEntrega === 'retiro' && (
                      <div className={styles.pagoSection}>
                        <h3 className={styles.formTitle} style={{ marginTop: '1.5rem' }}>Método de pago</h3>
                        <div className={styles.entregaOpciones}>
                          <button
                            type="button"
                            className={`${styles.entregaBtn} ${metodoPago === 'mp' ? styles.entregaBtnActive : ''}`}
                            onClick={() => setMetodoPago('mp')}
                          >
                            <span className={styles.entregaIcon}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                              </svg>
                            </span>
                            <span className={styles.entregaLabel}>Mercado Pago</span>
                            <span className={styles.entregaSub}>Tarjeta / transferencia</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.entregaBtn} ${metodoPago === 'efectivo' ? styles.entregaBtnActive : ''}`}
                            onClick={() => setMetodoPago('efectivo')}
                          >
                            <span className={styles.entregaIcon}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
                              </svg>
                            </span>
                            <span className={styles.entregaLabel}>Efectivo en local</span>
                            <span className={styles.entregaSub}>Pagás al retirar</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Zonas de envio ── */}
                    {tipoEntrega === 'envio' && (
                      <div className={styles.zonaSection}>
                        <label className={styles.zonaLabel}>Selecciona tu zona *</label>
                        <div className={styles.zonaOpciones}>
                          {ZONAS.map((z) => (
                            <button
                              key={z.value}
                              type="button"
                              className={`${styles.zonaBtn} ${zona === z.value ? styles.zonaBtnActive : ''}`}
                              onClick={() => { setZona(z.value); setDireccion(''); }}
                            >
                              {z.label}
                            </button>
                          ))}
                        </div>

                        {zona && (
                          <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label htmlFor="direccion">Direccion en {zonaLabel} *</label>
                            <input
                              id="direccion"
                              type="text"
                              value={direccion}
                              onChange={(e) => setDireccion(e.target.value)}
                              placeholder={`Tu calle y numero en ${zonaLabel}`}
                              required
                              autoComplete="street-address"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Método de pago para envio — aparece luego de zona+dirección */}
                    {tipoEntrega === 'envio' && zona && direccion.trim() && (
                      <div className={styles.pagoSection}>
                        <h3 className={styles.formTitle} style={{ marginTop: '1.5rem' }}>Método de pago</h3>
                        <div className={styles.entregaOpciones}>
                          <button type="button" className={`${styles.entregaBtn} ${metodoPago === 'mp' ? styles.entregaBtnActive : ''}`} onClick={() => setMetodoPago('mp')}>
                            <span className={styles.entregaIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span>
                            <span className={styles.entregaLabel}>Mercado Pago</span>
                            <span className={styles.entregaSub}>Tarjeta / transferencia</span>
                          </button>
                          <button type="button" className={`${styles.entregaBtn} ${metodoPago === 'efectivo' ? styles.entregaBtnActive : ''}`} onClick={() => setMetodoPago('efectivo')}>
                            <span className={styles.entregaIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg></span>
                            <span className={styles.entregaLabel}>Efectivo al recibir</span>
                            <span className={styles.entregaSub}>Pagás cuando te lo entregamos</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Boton pagar ── */}
                    {((tipoEntrega === 'envio' && zona && direccion) || tipoEntrega === 'retiro') && metodoPago ? (
                      <button
                        type="submit"
                        className={`btn w-full ${metodoPago === 'efectivo' ? 'btn-primary' : 'btn-accent'}`}
                        style={{ padding: '0.875rem', fontSize: '1rem', marginTop: '1.25rem' }}
                        disabled={loading}
                      >
                        {loading ? 'Procesando...' : metodoPago === 'efectivo' ? (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/>
                            </svg>
                            Confirmar pedido — pago en efectivo
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                            </svg>
                            Ir a pagar con Mercado Pago
                          </span>
                        )}
                      </button>
                    ) : null}

                    <p className={styles.createAccountHint}>
                      Queres guardar tus datos para la proxima compra?{' '}
                      <Link href="/registro" className="text-green">Crear cuenta gratis</Link>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className={styles.form}>
                    <h3 className={styles.formTitle}>Ingresa a tu cuenta</h3>

                    <div className="form-group">
                      <label htmlFor="lemail">Email</label>
                      <input
                        id="lemail"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="lpassword">Contrasena</label>
                      <input
                        id="lpassword"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      style={{ padding: '0.875rem', fontSize: '1rem' }}
                      disabled={loading}
                    >
                      {loading ? 'Ingresando...' : 'Ingresar y pagar'}
                    </button>

                    <p className={styles.createAccountHint}>
                      No tenes cuenta?{' '}
                      <Link href="/registro" className="text-green">Registrarse</Link>
                    </p>
                  </form>
                )}
              </>
            )}
          </div>

          {/* ── Right: order summary ──────────────────────────── */}
          <div className={styles.summary}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 className={styles.summaryTitle}>Resumen del pedido</h3>

              <ul className={styles.summaryItems}>
                {items.map((item) => (
                  <li key={item.id} className={styles.summaryItem}>
                    <div className={styles.summaryItemImg}>
                      <Image
                        src={item.imagen ? `/images/${item.imagen}` : '/images/no-image.svg'}
                        alt={item.nombre}
                        fill
                        sizes="48px"
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className={styles.summaryItemName}>{item.nombre}</p>
                      <p className="text-gray" style={{ fontSize: '0.8rem' }}>
                        x{item.quantity}
                      </p>
                    </div>
                    <strong style={{ color: 'var(--green-dark)', fontFamily: 'var(--font-title)' }}>
                      {formatPrice(item.precio * item.quantity)}
                    </strong>
                  </li>
                ))}
              </ul>

              <div className={styles.summaryTotal}>
                <span>Total</span>
                <strong className={styles.totalAmount}>{formatPrice(total)}</strong>
              </div>

              <p className={styles.mpNote}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Pago procesado de forma segura por Mercado Pago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
