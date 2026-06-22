'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import CartDrawer from '@/components/cart/CartDrawer';
import styles from './Navbar.module.css';

const CATEGORIES = [
  { label: 'Perros',     href: '/categoria/perros' },
  { label: 'Cachorros',  href: '/categoria/cachorros' },
  { label: 'Gatos',      href: '/categoria/gatos' },
  { label: 'Gatitos',    href: '/categoria/gatitos' },
  { label: 'Granos',     href: '/categoria/granos' },
  { label: 'Accesorios', href: '/categoria/accesorios' },
];

const PETS_NAV = { label: 'Mascotas Perdidas', href: '/mascotas' };

const MARCAS_NAV = [
  { nombre: 'Agility',       img: '/images/marcas/agility.png'        },
  { nombre: 'Biomax',        img: '/images/marcas/biomax.jpeg'         },
  { nombre: 'Canfeed',       img: '/images/marcas/canfeed.jpg'         },
  { nombre: 'Cat Chow',      img: '/images/marcas/cat_chow.png'        },
  { nombre: 'Dog Selection', img: '/images/marcas/dog_selection.png'   },
  { nombre: 'Essential',     img: '/images/marcas/essential.png'       },
  { nombre: 'Exact',         img: '/images/marcas/exact.jpg'           },
  { nombre: 'Gati',          img: '/images/marcas/gati.jpg'            },
  { nombre: 'Gooster',       img: '/images/marcas/gooster.png'         },
  { nombre: 'Gran Campeón',  img: '/images/marcas/gran_campeon.jpg'    },
  { nombre: 'Ken-L',         img: '/images/marcas/ken-l.jpg'           },
  { nombre: 'Estampa',       img: '/images/marcas/logo-estampa3.jpg'   },
  { nombre: 'Instinto',      img: '/images/marcas/Logo_instinto.png'   },
  { nombre: 'Nutribon',      img: '/images/marcas/nutribon.jfif'       },
  { nombre: 'Optimun',       img: '/images/marcas/optimun.jpg'         },
  { nombre: 'Pedigree',      img: '/images/marcas/pedigree-logo.png'   },
  { nombre: 'Sabrositos',    img: '/images/marcas/sabrositos.jfif'     },
  { nombre: 'Sieger',        img: '/images/marcas/sieger.png'          },
  { nombre: 'Upper',         img: '/images/marcas/upper.jpg'           },
  { nombre: 'Vagoneta',      img: '/images/marcas/VAGONETA-LOGO.png'   },
  { nombre: 'Voraz',         img: '/images/marcas/voraz.png'           },
  { nombre: 'Whiskas',       img: '/images/marcas/whiskas.jpg'         },
];

export default function Navbar() {
  const { itemCount, total } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [marcasOpen, setMarcasOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const marcasRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

  // Close suggestions when clicking outside
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSugg(false);
      }
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setSuggestions([]); setShowSugg(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setShowSugg((data.suggestions ?? []).length > 0);
        setActiveIdx(-1);
      } catch { /* ignore */ }
    }, 220);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = activeIdx >= 0 && suggestions[activeIdx] ? suggestions[activeIdx] : query;
    setShowSugg(false);
    if (q.trim()) router.push(`/productos?q=${encodeURIComponent(q.trim())}`);
  }

  function handleSuggestionClick(s: string) {
    setQuery(s);
    setShowSugg(false);
    router.push(`/productos?q=${encodeURIComponent(s)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSugg || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSugg(false);
      setActiveIdx(-1);
    }
  }

  return (
    <>
      <header className={styles.header}>
        {/* ── Top bar: logo + search + actions ── */}
        <div className={styles.topBar}>
          <div className={`container ${styles.topInner}`}>

            {/* Logo */}
            <Link href="/" className={styles.logo}>
              <Image src="/images/logo_huellitas.png" alt="Huellitas Petshop" width={72} height={72} priority sizes="72px" style={{ objectFit: 'contain' }} />
              <span className={styles.brandName}>Huellitas<span className={styles.brandSub}>Petshop</span></span>
            </Link>

            {/* Search */}
            <div ref={searchWrapRef} className={styles.searchWrap}>
            <form className={styles.searchForm} onSubmit={handleSearch}>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Buscar un producto o artículo"
                value={query}
                onChange={(e) => { setQuery(e.target.value); fetchSuggestions(e.target.value); }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSugg(true); }}
                autoComplete="off"
              />
              <button type="submit" className={styles.searchSubmit} aria-label="Buscar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            </form>
            {showSugg && suggestions.length > 0 && (
              <ul className={styles.suggestions} role="listbox">
                {suggestions.map((s, i) => (
                  <li
                    key={s}
                    className={`${styles.suggItem} ${i === activeIdx ? styles.suggItemActive : ''}`}
                    onMouseDown={() => handleSuggestionClick(s)}
                    onMouseEnter={() => setActiveIdx(i)}
                    role="option"
                    aria-selected={i === activeIdx}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.suggIcon}>
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            )}
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <Link href="/perfil" className={`${styles.actionBtn} ${styles.desktopOnly}`} aria-label="Mi cuenta">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <span className={styles.actionLabel}>Mi cuenta</span>
              </Link>

              <Link href="/perfil" className={`${styles.actionBtn} ${styles.desktopOnly}`} aria-label="Mis pedidos">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1"/>
                  <line x1="9" y1="12" x2="15" y2="12"/>
                  <line x1="9" y1="16" x2="13" y2="16"/>
                </svg>
                <span className={styles.actionLabel}>Mis pedidos</span>
              </Link>

              <button className={styles.actionBtn} onClick={() => setCartOpen(true)} aria-label="Carrito">
                <span className={styles.cartWrap}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  {itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
                </span>
                <span className={styles.cartTotal}>$ {total.toLocaleString('es-AR')}</span>
              </button>

              {/* Hamburger */}
              <button className={styles.hamburger} onClick={() => setMenuOpen((v) => !v)} aria-label="Menú">
                <span /><span /><span />
              </button>
            </div>
          </div>
        </div>

        {/* ── Category nav bar ── */}
        <nav className={styles.catNav}>
          <div className={`container ${styles.catNavInner}`}>
            {CATEGORIES.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={`${styles.catLink} ${currentHref === c.href ? styles.catLinkActive : ''}`}
              >{c.label}</Link>
            ))}
            <Link
              href="/productos"
              className={`${styles.catLink} ${pathname === '/productos' && !searchParams.get('categoria') ? styles.catLinkActive : ''}`}
            >Todos</Link>

{/* Marcas dropdown */}
            <div
              className={styles.marcasNavItem}
              ref={marcasRef}
              onMouseEnter={() => setMarcasOpen(true)}
              onMouseLeave={() => setMarcasOpen(false)}
            >
              <button className={styles.marcasNavBtn} onClick={() => setMarcasOpen((v) => !v)}>
                Marcas
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {marcasOpen && (
                <div className={styles.marcasDropdown}>
                  <p className={styles.dropdownTitle}>Marcas que trabajamos</p>
                  <div className={styles.marcasGrid}>
                    {MARCAS_NAV.map((m) => (
                      <Link
                        key={m.nombre}
                        href={`/productos?q=${encodeURIComponent(m.nombre)}`}
                        className={styles.marcaDropItem}
                        onClick={() => setMarcasOpen(false)}
                      >
                        <Image
                          src={m.img}
                          alt={m.nombre}
                          width={40}
                          height={40}
                          className={styles.marcaDropImg}
                          unoptimized
                        />
                        <span className={styles.marcaDropName}>{m.nombre}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href={PETS_NAV.href} className={styles.petsNavLink}>
              {PETS_NAV.label}
            </Link>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <ul className={styles.mobileMenu}>
            <li><Link href="/" onClick={() => setMenuOpen(false)}>Inicio</Link></li>
            <li className={styles.mobileMenuDivider} />
            {CATEGORIES.map((c) => (
              <li key={c.href}>
                <Link href={c.href} onClick={() => setMenuOpen(false)}>{c.label}</Link>
              </li>
            ))}
            <li><Link href="/productos" onClick={() => setMenuOpen(false)}>Todos los productos</Link></li>
            <li className={styles.mobileMenuDivider} />
            <li><Link href={PETS_NAV.href} onClick={() => setMenuOpen(false)} className={styles.mobilePetsLink}>{PETS_NAV.label}</Link></li>
            <li className={styles.mobileMenuDivider} />
            <li><Link href="/perfil" onClick={() => setMenuOpen(false)}>Mi cuenta</Link></li>
            <li><Link href="/perfil" onClick={() => setMenuOpen(false)}>Mis pedidos</Link></li>
          </ul>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
