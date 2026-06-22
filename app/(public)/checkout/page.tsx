'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import type { GuestCheckoutData } from '@/types';
import { DeliveryTypeSelector } from './DeliveryTypeSelector';
import { ZoneAddressSelector } from './ZoneAddressSelector';
import { PaymentMethodSelector, buildPaymentOptions } from './PaymentMethodSelector';
import styles from './page.module.css';

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

  // On every mount: cancel any MP order that was abandoned (e.g. user navigated away)
  useEffect(() => {
    const raw = sessionStorage.getItem('mp_pending');
    if (!raw) return;
    sessionStorage.removeItem('mp_pending');
    try {
      const { orderId, preferenceId, cancelToken } = JSON.parse(raw) as { orderId: string; preferenceId: string; cancelToken?: string };
      fetch('/api/payments/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ orderId, preferenceId, cancelToken }),
      }).catch(() => {});
      setError('El pago no fue completado. Podés intentarlo nuevamente.');
    } catch { /* ignore parse errors */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Also handle bfcache restoration (browser Back restoring the frozen page)
  useEffect(() => {
    const handler = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      const raw = sessionStorage.getItem('mp_pending');
      if (!raw) return;
      sessionStorage.removeItem('mp_pending');
      try {
        const { orderId, preferenceId, cancelToken } = JSON.parse(raw) as { orderId: string; preferenceId: string; cancelToken?: string };
        fetch('/api/payments/cancel-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ orderId, preferenceId, cancelToken }),
        }).catch(() => {});
      } catch { /* ignore parse errors */ }
      setLoading(false);
      setError('El pago no fue completado. Podés intentarlo nuevamente.');
    };
    window.addEventListener('pageshow', handler);
    return () => window.removeEventListener('pageshow', handler);
  }, []);

  // Guest form state
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'envio' | ''>('');
  const [zona, setZona] = useState('');
  const [direccion, setDireccion] = useState('');
  const [metodoPago, setMetodoPago] = useState<'mp' | 'efectivo' | ''>('');

  // Promo code
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ code, total }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoApplied({ code: data.code, discount: data.discount });
        setPromoInput('');
      } else {
        setPromoError(data.message ?? 'Código inválido');
      }
    } catch {
      setPromoError('Error al validar el código');
    } finally {
      setPromoLoading(false);
    }
  };

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
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ items, total, guest: guestData, delivery, promoCode: promoApplied?.code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al procesar el pago');
      }

      const { init_point, orderId, preferenceId, cancelToken } = await res.json();
      sessionStorage.setItem('mp_pending', JSON.stringify({ orderId, preferenceId, cancelToken }));
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
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ items, total, guest: guestData, delivery, promoCode: promoApplied?.code }),
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
                <DeliveryTypeSelector
                  tipoEntrega={tipoEntrega}
                  onChange={(t) => { setTipoEntrega(t); setMetodoPago(''); if (t === 'retiro') { setZona(''); setDireccion(''); } }}
                />

                {tipoEntrega === 'retiro' && (
                  <PaymentMethodSelector value={metodoPago} onChange={(v) => setMetodoPago(v as 'mp' | 'efectivo' | '')} options={buildPaymentOptions('retiro')} />
                )}

                {tipoEntrega === 'envio' && (
                  <ZoneAddressSelector zona={zona} direccion={direccion} onZonaChange={setZona} onDireccionChange={setDireccion} />
                )}

                {tipoEntrega === 'envio' && zona && direccion.trim() && (
                  <PaymentMethodSelector value={metodoPago} onChange={(v) => setMetodoPago(v as 'mp' | 'efectivo' | '')} options={buildPaymentOptions('envio')} />
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
                    className={styles.tab}
                    onClick={() => router.push('/login?redirect=/checkout')}
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
                    <DeliveryTypeSelector
                      tipoEntrega={tipoEntrega}
                      onChange={(t) => { setTipoEntrega(t); setMetodoPago(''); if (t === 'retiro') { setZona(''); setDireccion(''); } }}
                    />

                    {tipoEntrega === 'retiro' && (
                      <PaymentMethodSelector value={metodoPago} onChange={(v) => setMetodoPago(v as 'mp' | 'efectivo' | '')} options={buildPaymentOptions('retiro')} />
                    )}

                    {tipoEntrega === 'envio' && (
                      <ZoneAddressSelector zona={zona} direccion={direccion} onZonaChange={setZona} onDireccionChange={setDireccion} />
                    )}

                    {tipoEntrega === 'envio' && zona && direccion.trim() && (
                      <PaymentMethodSelector value={metodoPago} onChange={(v) => setMetodoPago(v as 'mp' | 'efectivo' | '')} options={buildPaymentOptions('envio')} />
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
                ) : null}
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
                        src={item.imagen ? (item.imagen.startsWith('http') ? item.imagen : `/images/${item.imagen}`) : '/images/no-image.svg'}
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
                <span>Subtotal</span>
                <strong style={{ color: 'var(--dark)' }}>{formatPrice(total)}</strong>
              </div>

              {/* ── Promo code ── */}
              {!promoApplied ? (
                <div className={styles.promoSection}>
                  <div className={styles.promoRow}>
                    <input
                      className={styles.promoInput}
                      type="text"
                      placeholder="Código de descuento"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
                      maxLength={20}
                    />
                    <button
                      type="button"
                      className={styles.promoBtn}
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoInput.trim()}
                    >
                      {promoLoading ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  {promoError && <p className={styles.promoError}>{promoError}</p>}
                </div>
              ) : (
                <div className={styles.promoApplied}>
                  <span className={styles.promoAppliedLabel}>
                    🎉 Cupón <strong>{promoApplied.code}</strong> aplicado
                  </span>
                  <span className={styles.promoAppliedDiscount}>−{formatPrice(promoApplied.discount)}</span>
                  <button
                    type="button"
                    className={styles.promoRemove}
                    onClick={() => setPromoApplied(null)}
                    aria-label="Quitar cupón"
                  >✕</button>
                </div>
              )}

              <div className={styles.summaryTotal} style={{ borderTop: promoApplied ? '2px solid var(--green-dark)' : undefined, paddingTop: promoApplied ? '0.75rem' : undefined }}>
                <span>Total</span>
                <strong className={styles.totalAmount}>
                  {formatPrice(promoApplied ? Math.max(0, total - promoApplied.discount) : total)}
                </strong>
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
