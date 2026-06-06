'use client';

import styles from './page.module.css';

interface Props {
  tipoEntrega: 'retiro' | 'envio' | '';
  onChange: (tipo: 'retiro' | 'envio') => void;
}

export function DeliveryTypeSelector({ tipoEntrega, onChange }: Props) {
  return (
    <div className={styles.entregaOpciones}>
      <button
        type="button"
        className={`${styles.entregaBtn} ${tipoEntrega === 'retiro' ? styles.entregaBtnActive : ''}`}
        onClick={() => onChange('retiro')}
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
        onClick={() => onChange('envio')}
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
  );
}
