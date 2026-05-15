'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/types';
import styles from './ProductCard.module.css';

interface Props {
  product: Product;
  /** All products in the group (same nombre). If provided and length > 1, shows "Ver opciones" instead of add-to-cart. */
  groupProducts?: Product[];
}

function formatPrice(n: number | null): string {
  if (n === null) return 'Consultar precio';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ProductCard({ product, groupProducts }: Props) {
  const { addItem } = useCart();

  const productHref = `/productos/${product.id}`;

  // Build kg labels: from group if provided, otherwise from the single product
  const allKgs: string[] = groupProducts
    ? groupProducts.map((p) => p.kg).filter((k): k is string => !!k)
    : product.kg ? [product.kg] : [];

  const isGroup = !!groupProducts && groupProducts.length > 1;

  const imageSrc = product.imagen
    ? product.imagen.startsWith('http')
      ? product.imagen
      : `/images/${product.imagen}`
    : '/images/no-image.svg';

  const [imgSrc, setImgSrc] = useState(imageSrc);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article className={`card ${styles.card}`}>
      <Link href={productHref} className={styles.imgWrap}>
        <Image
          src={imgSrc}
          alt={product.nombre}
          fill
          sizes="(max-width: 768px) 50vw, 220px"
          className={styles.img}
          unoptimized={imgFailed}
          onError={() => {
            if (!imgFailed) {
              setImgSrc('/images/no-image.svg');
              setImgFailed(true);
            }
          }}
        />
        <span className={`badge badge-green ${styles.catBadge}`}>
          {product.categoria}
        </span>
        {product.promo_label && (
          <span className={styles.promoBadge}>{product.promo_label}</span>
        )}
        {!product.promo_label && product.descuento != null && product.descuento > 0 && product.descuento < (product.precio ?? Infinity) && (
          <span className={styles.discountBadge}>Oferta</span>
        )}
        {product.kg_regalo && (
          <div className={styles.giftBanner}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            <span>+{product.kg_regalo} GRATIS</span>
          </div>
        )}
      </Link>

      <div className={styles.body}>
        <Link href={productHref}>
          <h3 className={styles.nombre}>{product.nombre}</h3>
        </Link>
        {allKgs.length > 0 && (
          <p className={styles.kg}>{allKgs.join(' / ')}</p>
        )}

        <div className={styles.footer}>
          <div className={styles.priceBlock}>
            {product.descuento != null && product.descuento > 0 && product.descuento < (product.precio ?? Infinity) && (
              <span className={styles.priceOriginal}>{formatPrice(product.precio)}</span>
            )}
            <span className={styles.price}>
              {formatPrice(product.descuento != null && product.descuento > 0 && product.descuento < (product.precio ?? Infinity) ? product.descuento : product.precio)}
            </span>
          </div>
          {isGroup ? (
            <Link href={productHref} className={`btn btn-primary ${styles.addBtn}`}>
              Ver opciones
            </Link>
          ) : (
            <button
              className={`btn btn-primary ${styles.addBtn}`}
              onClick={() => addItem(product)}
              disabled={product.stock === 0}
              aria-label={product.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
            >
              {product.stock === 0 ? (
                'Sin stock'
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <span className={styles.addBtnLabel}>Carrito</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
