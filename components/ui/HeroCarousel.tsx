'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './HeroCarousel.module.css';

const SLIDES = [
  {
    src: '/images/afuera.jpeg',
    alt: 'Huellitas Petshop',
    title: 'Bienvenidos a Huellitas',
    subtitle: 'Todo para tu mascota en un solo lugar',
    cta: { label: 'Ver productos', href: '/productos' },
  },
  {
    src: '/images/adentro.jpeg',
    alt: 'Huellitas Petshop interior',
    title: 'Alimentos premium',
    subtitle: 'Las mejores marcas al mejor precio',
    cta: { label: 'Ver alimentos', href: '/productos?categoria=perros' },
  },
  {
    src: '/images/collares.jpeg',
    alt: 'Accesorios Huellitas',
    title: 'Accesorios y más',
    subtitle: 'Todo lo que tu mascota necesita',
    cta: { label: 'Ver accesorios', href: '/productos?categoria=accesorios' },
  },
  {
    src: '/images/golosinas.jpeg',
    alt: 'Huellitas desde afuera',
    title: 'Encontranos en Mendoza',
    subtitle: 'Visitanos o comprá online',
    cta: { label: 'Ver ubicación', href: 'https://maps.app.goo.gl/CBno9HJUc3WoWXFz5?g_st=iw', external: true },
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  const prev = () => {
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
  };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
