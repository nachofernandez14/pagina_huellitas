'use client';

import { useEffect, useRef } from 'react';
import styles from './Toast.module.css';

interface Props {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, onDismiss, duration = 3000 }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message, onDismiss, duration]);

  if (!message) return null;

  const variant = message.startsWith('❌') ? styles.error
    : message.startsWith('🗑') ? styles.warn
    : styles.success;

  return (
    <div className={`${styles.toast} ${variant}`} role="status" aria-live="polite">
      <span className={styles.msg}>{message}</span>
      <button className={styles.close} onClick={onDismiss} aria-label="Cerrar">✕</button>
    </div>
  );
}
