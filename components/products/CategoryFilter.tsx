'use client';

import Image from 'next/image';
import { LayoutGrid } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import styles from './CategoryFilter.module.css';

const CATEGORIES = [
  { value: '',           label: 'Todos',      img: null },
  { value: 'perros',     label: 'Perros',     img: '/images/categorias/perro-adulto.png' },
  { value: 'cachorros',  label: 'Cachorros',  img: '/images/categorias/cachorro.png' },
  { value: 'gatos',      label: 'Gatos',      img: '/images/categorias/gato-adulto.png' },
  { value: 'gatitos',    label: 'Gatitos',    img: '/images/categorias/gatito.png' },
  { value: 'granos',     label: 'Granos',     img: '/images/categorias/granos.png' },
  { value: 'accesorios', label: 'Accesorios', img: '/images/categorias/accesorios.png' },
];

export default function CategoryFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const categoriaFromPath = pathname.startsWith('/categoria/')
    ? pathname.replace('/categoria/', '').split('/')[0]
    : '';
  const current = categoriaFromPath || params.get('categoria') || '';

  const handleChange = (value: string) => {
    const url = value ? `/categoria/${value}` : '/productos';
    router.push(url);
  };

  return (
    <div className={styles.wrapper}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          className={`${styles.pill} ${current === cat.value ? styles.active : ''}`}
          onClick={() => handleChange(cat.value)}
        >
          {cat.img ? (
            <Image src={cat.img} alt={cat.label} width={22} height={22} className={styles.catImg} />
          ) : (
            <LayoutGrid size={20} strokeWidth={1.75} />
          )}
          {cat.label}
        </button>
      ))}
    </div>
  );
}
