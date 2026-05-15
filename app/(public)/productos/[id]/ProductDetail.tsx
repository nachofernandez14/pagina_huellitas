'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCart, MessageCircle, Store, Truck, Dna } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/types';
import styles from './page.module.css';

function formatPrice(n: number | null): string {
  if (n === null) return 'Consultar precio';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function parseKg(kg: string): number {
  const match = kg.match(/[\d,.]+/);
  if (!match) return 0;
  return parseFloat(match[0].replace(',', '.'));
}

type Presentation = { id: string; kg: string; precio: number };

function buildPresentations(product: Product, siblings: Product[]): Presentation[] {
  const all = [product, ...siblings].filter((p) => p.kg && p.precio != null);
  return all
    .map((p) => ({ id: p.id, kg: p.kg!, precio: p.precio! }))
    .sort((a, b) => parseKg(b.kg) - parseKg(a.kg));
}

interface Props {
  product: Product;
  siblings?: Product[];
}

function ProductDetailInner({ product, siblings = [] }: Props) {
  const { addItem } = useCart();
  const router = useRouter();

  const presentations = buildPresentations(product, siblings);
  const hasMultiple = presentations.length > 1;

  const currentPresentation = presentations.find((p) => p.id === product.id)
    ?? presentations[0]
    ?? { id: product.id, kg: product.kg ?? '', precio: product.precio ?? 0 };

  const [selected, setSelected] = useState<Presentation>(currentPresentation);

  const handleSelectPresentation = (pres: Presentation) => {
    if (pres.id === product.id) {
      setSelected(pres);
    } else {
      router.push(`/productos/${pres.id}`);
    }
  };

  const handleAddToCart = () => {
    addItem({
      ...product,
      id: product.id,
      precio: selected.precio,
      kg: selected.kg,
    });
  };

  const imageSrc = product.imagen
    ? product.imagen.startsWith('http')
      ? product.imagen
      : `/images/${product.imagen}`
    : '/images/no-image.svg';

  return (
    <div className={styles.layout}>
      {/* Imagen */}
      <div className={styles.imgWrap}>
        <Image
          src={imageSrc}
          alt={product.nombre}
          fill
          sizes="(max-width: 768px) 100vw, 520px"
          className={styles.img}
          priority
        />
      </div>

      {/* Info */}
      <div className={styles.info}>
        <span className={`badge badge-green ${styles.breadcrumb}`}>
          {product.categoria}
          {product.subcategoria ? ` · ${product.subcategoria}` : ''}
        </span>

        <h1 className={styles.nombre}>{product.nombre}</h1>

        {/* Selector de presentaciones */}
        {hasMultiple ? (
          <div className={styles.variantSection}>
            <p className={styles.variantLabel}>Elegí la presentación:</p>
            <div className={styles.variantBtns}>
              {presentations.map((pres) => (
                <button
                  key={pres.id}
                  type="button"
                  className={`${styles.variantBtn} ${selected.id === pres.id ? styles.variantBtnActive : ''}`}
                  onClick={() => handleSelectPresentation(pres)}
                >
                  {pres.kg}
                </button>
              ))}
            </div>
          </div>
        ) : selected.kg ? (
          <p className={styles.kg}>Presentación: {selected.kg}</p>
        ) : null}

        {product.promo_label && (
          <div className={styles.promoBanner}>
            <span>{product.promo_label}</span>
          </div>
        )}

        <div className={styles.priceBlock}>
          {product.descuento != null && product.descuento > 0 && product.descuento < selected.precio && (
            <span className={styles.priceOriginal}>{formatPrice(selected.precio)}</span>
          )}
          <p className={styles.price}>
            {formatPrice(product.descuento != null && product.descuento > 0 && product.descuento < selected.precio ? product.descuento : selected.precio)}
          </p>
        </div>

        <div className={styles.stockRow}>
          <span className={`${styles.stockDot} ${product.stock > 0 ? styles.stockIn : styles.stockOut}`} />
          <span className={styles.stockLabel}>
            {product.stock > 0 ? 'En stock' : 'Sin stock'}
          </span>
        </div>

        <button
          className={`btn btn-accent ${styles.addBtn}`}
          onClick={handleAddToCart}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? 'Sin stock' : <><ShoppingCart size={18} strokeWidth={2} /> Agregar al carrito</>}
        </button>

        <a
          href={`https://wa.me/5492616635666?text=Hola%20Huellitas%2C%20quiero%20consultar%20sobre%20${encodeURIComponent(product.nombre)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
          style={{ textAlign: 'center', marginTop: '0.75rem' }}
        >
          <MessageCircle size={18} strokeWidth={2} /> Consultar por WhatsApp
        </a>

        <hr className={styles.divider} />

        {/* Info de entrega */}
        <div className={styles.infoCards}>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}><Store size={22} strokeWidth={1.75} /></span>
            <div>
              <p className={styles.infoTitle}>Retiro en sucursal</p>
              <p className={styles.infoSub}>Sin costo adicional</p>
            </div>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}><Truck size={22} strokeWidth={1.75} /></span>
            <div>
              <p className={styles.infoTitle}>Envío a domicilio</p>
              <p className={styles.infoSub}>Zonas disponibles</p>
            </div>
          </div>
        </div>

        {/* Proteína */}
        {product.proteina && (
          <div className={styles.proteinaRow}>
            <span className={styles.proteinaIcon}><Dna size={16} strokeWidth={1.75} /></span>
            <span className={styles.proteinaLabel}>Proteína:</span>
            <span className={styles.proteinaValue}>{product.proteina}</span>
          </div>
        )}

        {/* Medios de pago */}
        <div className={styles.payments}>
          <span className={styles.payLabel}>Medios de pago</span>
          <div className={styles.payIcons}>
            <span className={`${styles.payBadge} ${styles.payMP}`}>MercadoPago</span>
            <span className={styles.payBadge}>Tarjeta de crédito</span>
            <span className={styles.payBadge}>Tarjeta de débito</span>
            <span className={styles.payBadge}>Billeteras virtuales</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail({ product, siblings }: Props) {
  return (
    <Suspense fallback={null}>
      <ProductDetailInner product={product} siblings={siblings} />
    </Suspense>
  );
}
