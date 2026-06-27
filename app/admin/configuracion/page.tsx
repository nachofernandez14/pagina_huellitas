'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface MPStatus {
  mp_configured: boolean;
  mp_access_token: string | null;
}

export default function ConfiguracionPage() {
  const [status, setStatus] = useState<MPStatus | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setStatus(d));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.subtitle}>Ajustes del panel administrativo</p>
      </div>

      {/* ── MercadoPago section ─────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 className={styles.sectionTitle}>MercadoPago</h2>
            <p className={styles.sectionDesc}>Estado del token de pagos configurado en variables de entorno.</p>
          </div>
          <div className={`${styles.statusBadge} ${status?.mp_configured ? styles.statusOk : styles.statusEmpty}`}>
            {status === null ? '...' : status.mp_configured ? '✓ Conectado' : 'Sin configurar'}
          </div>
        </div>

        {status?.mp_configured && (
          <div className={styles.currentToken}>
            <span className={styles.tokenLabel}>Token activo (env):</span>
            <code className={styles.tokenMask}>{status.mp_access_token}</code>
          </div>
        )}

        {/* Instructions */}
        <div className={styles.infoBox}>
          <h4 className={styles.infoTitle}>¿Cómo configurar el Access Token?</h4>
          <ol className={styles.infoList}>
            <li>Entrá a <strong>mercadopago.com.ar</strong> con tu cuenta</li>
            <li>Ir a <strong>Tu negocio → Configuraciones → Credenciales</strong></li>
            <li>Copiá el <strong>Access Token de producción</strong> (empieza con <code>APP_USR-</code>)</li>
            <li>Agregalo como variable de entorno <code>MP_ACCESS_TOKEN</code> en tu servidor o panel de Vercel</li>
            <li>Reiniciá el servidor para que los cambios tomen efecto</li>
          </ol>
          <p className={styles.infoNote}>
            El token se almacena exclusivamente en variables de entorno para mayor seguridad.
            Nunca se guarda en la base de datos.
          </p>
        </div>
      </section>
    </div>
  );
}
