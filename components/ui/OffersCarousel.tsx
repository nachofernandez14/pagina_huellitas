'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import ProductCard from '@/components/products/ProductCard';
import styles from './OffersCarousel.module.css';

interface Props {
  products: Product[];
}

export default function OffersCarousel({ products }: Props) {
  const [index, setIndex] = useState(0);
  const perPage = 3;
  const total = products.length;
  const maxIndex = Math.max(0, total - perPage);
  const hasNavigation = total > perPage;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

  const visible = hasNavigation ? products.slice(index, index + perPage) : products;

  if (total === 0) return (
    <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem 0' }}>
      Próximamente las mejores ofertas para tu mascota.
    </p>
  );

  return (
    <div className={styles.wrapper}>
      {hasNavigation && (
        <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prev} disabled={index === 0} aria-label="Anterior">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      )}

      <div className={`${styles.track} ${!hasNavigation ? styles.trackCentered : ''}`}>
        {visible.map((p) => (
          <div key={p.id} className={styles.item}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {hasNavigation && (
        <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={next} disabled={index >= maxIndex} aria-label="Siguiente">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      )}

      {/* Dots */}
      {hasNavigation && (
        <div className={styles.dots}>
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Página ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
