'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './HeroCarousel.module.css';

interface Slide {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string; external?: boolean };
}

const SLIDES: Slide[] = [
  {
    src: '/images/c1.png',
    alt: 'Huellitas Petshop',
    title: 'Bienvenidos a Huellitas',
    subtitle: 'Todo para tu mascota en un solo lugar',
    cta: { label: 'Ver productos', href: '/productos' },
  },
  {
    src: '/images/c3.png',
    alt: 'Huellitas Petshop interior',
    title: 'Alimentos premium',
    subtitle: 'Las mejores marcas al mejor precio',
    cta: { label: 'Ver alimentos', href: '/categoria/perros' },
  },
  {
    src: '/images/c2.png',
    alt: 'Accesorios Huellitas',
    title: 'Accesorios y más',
    subtitle: 'Todo lo que tu mascota necesita',
    cta: { label: 'Ver accesorios', href: '/categoria/accesorios' },
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  const prev = () => {
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
  };

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.carousel}>
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`${styles.slide} ${i === current ? styles.active : ''}`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            style={{ objectFit: 'cover' }}
            priority={i === 0}
          />
          <div className={styles.overlay} />
          <div className={styles.content}>
            <h1 className={styles.title}>{slide.title}</h1>
            <p className={styles.subtitle}>{slide.subtitle}</p>
            <Link
              href={slide.cta.href}
              className={styles.cta}
              {...(slide.cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {slide.cta.label}
            </Link>
          </div>
        </div>
      ))}

      <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prev} aria-label="Anterior">
        ‹
      </button>
      <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={next} aria-label="Siguiente">
        ›
      </button>

      <div className={styles.dots}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Ir a slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
