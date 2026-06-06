'use client';

import styles from './page.module.css';

interface Option {
  value: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const MP_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const CASH_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
  </svg>
);

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: [Option, Option];
}

export function PaymentMethodSelector({ value, onChange, options }: Props) {
  return (
    <div className={styles.pagoSection}>
      <h3 className={styles.formTitle} style={{ marginTop: '1.5rem' }}>Método de pago</h3>
      <div className={styles.entregaOpciones}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.entregaBtn} ${value === opt.value ? styles.entregaBtnActive : ''}`}
            onClick={() => onChange(opt.value)}
          >
            <span className={styles.entregaIcon}>{opt.icon}</span>
            <span className={styles.entregaLabel}>{opt.label}</span>
            <span className={styles.entregaSub}>{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function buildPaymentOptions(tipoEntrega: 'retiro' | 'envio'): [Option, Option] {
  const cashLabel = tipoEntrega === 'envio' ? 'Efectivo al recibir' : 'Efectivo en local';
  const cashSub = tipoEntrega === 'envio' ? 'Pagás cuando te lo entregamos' : 'Pagás al retirar';
  return [
    { value: 'mp', label: 'Mercado Pago', sub: 'Tarjeta / transferencia', icon: MP_ICON },
    { value: 'efectivo', label: cashLabel, sub: cashSub, icon: CASH_ICON },
  ];
}

export { MP_ICON, CASH_ICON };
