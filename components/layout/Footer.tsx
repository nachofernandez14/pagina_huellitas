'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>

          {/* Columna 1: Marca */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandWrap}>
              <Image
                src="/images/logo_huellitas.png"
                alt="Huellitas Petshop Mendoza — alimentos y accesorios para mascotas"
                width={44}
                height={44}
                style={{ borderRadius: 8 }}
              />
              <span className={styles.brandName}>
                Huellitas<span className={styles.brandSub}>Petshop</span>
              </span>
            </Link>
            <p className={styles.tagline}>Donde cada huellita importa.</p>
            <a
              href="https://wa.me/5492616635666?text=Hola%20Huellitas%2C%20quiero%20consultar%20algo"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={styles.waBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.14c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24s-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.65.31-.22.25-.86.85-.86 2.07 0 1.22.88 2.4 1 2.57.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/>
              </svg>
              Consultanos por WhatsApp
            </a>
          </div>

          {/* Columna 2: Productos */}
          <div>
            <h4 className={styles.colTitle}>Productos</h4>
            <ul className={styles.list}>
              <li><Link href="/categoria/perros">Perros adultos</Link></li>
              <li><Link href="/categoria/cachorros">Cachorros</Link></li>
              <li><Link href="/categoria/gatos">Gatos adultos</Link></li>
              <li><Link href="/categoria/gatitos">Gatitos</Link></li>
              <li><Link href="/categoria/granos">Granos</Link></li>
              <li><Link href="/categoria/accesorios">Accesorios</Link></li>
            </ul>
          </div>

          {/* Columna 3: Mi cuenta */}
          <div>
            <h4 className={styles.colTitle}>Mi cuenta</h4>
            <ul className={styles.list}>
              <li><Link href="/login">Ingresar</Link></li>
              <li><Link href="/registro">Registrarse</Link></li>
              <li><Link href="/perfil">Mis pedidos</Link></li>
              <li><Link href="/carrito">Mi carrito</Link></li>
            </ul>
          </div>

          {/* Columna 4: Ayuda */}
          <div>
            <h4 className={styles.colTitle}>Ayuda</h4>
            <ul className={styles.list}>
              <li><Link href="/faq">Preguntas frecuentes</Link></li>
              <li><Link href="/legal/envios">Política de envíos</Link></li>
              <li><Link href="/legal/privacidad">Privacidad</Link></li>
              <li><Link href="/legal/terminos">Términos y condiciones</Link></li>
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h4 className={styles.colTitle}>Contacto</h4>
            <ul className={styles.list}>
              <li className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                Rodeo de la Cruz, Mendoza, Argentina
              </li>
              <li className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6 6l.94-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16"/>
                  </svg>
                </span>
                +54 9 261 663-5666
              </li>
              <li className={styles.contactItem}>
                <span className={styles.contactIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/>
                  </svg>
                </span>
                <a href="mailto:petshophuellitas65@gmail.com" className={styles.emailLink}>
                  petshophuellitas65@gmail.com
                </a>
              </li>
            </ul>

            <div className={styles.horario}>
              <p className={styles.horarioTitle}>Horario de atención</p>
              <p>Lun – Vie: 9:00–13:15 y 16:45–20:30</p>
              <p>Sábado: 9:00–13:30 y 17:00–20:30</p>
              <p>Domingo: 10:00–13:00</p>
            </div>
          </div>

        </div>

        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} Huellitas Petshop · Todos los derechos reservados</p>
          <div className={styles.legalLinks}>
            <Link href="/legal/terminos">Términos y Condiciones</Link>
            <span className={styles.legalSep}>·</span>
            <Link href="/legal/privacidad">Privacidad</Link>
            <span className={styles.legalSep}>·</span>
            <Link href="/legal/envios">Política de Envíos</Link>
          </div>
        </div>
        <div className={styles.poweredBy}>
          <a
            href="https://www.bitandbrain.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.poweredByLink}
          >
            <span className={styles.poweredByText}>Powered by</span>
            <Image
              src="/images/bitandbrain.png"
              alt="Bit and Brain Software Factory"
              width={110}
              height={56}
              style={{ objectFit: 'contain' }}
              className={styles.poweredByLogo}
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
