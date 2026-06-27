import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Cómo Huellitas Petshop protege tus datos en compras online desde Mendoza.',
  alternates: { canonical: '/legal/privacidad' },
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Inicio</Link>
        <span className={styles.sep}>/</span>
        <span>Política de Privacidad</span>
      </nav>

      <div className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Política de Privacidad</h1>
        <p className={styles.updated}>Última actualización: mayo de 2026</p>
      </div>

      <div className={styles.content}>
        <p>
          En <strong>Huellitas Petshop</strong> nos tomamos muy en serio la privacidad de tus datos.
          Esta Política explica qué información recopilamos, cómo la usamos y qué derechos tenés
          sobre ella, en cumplimiento de la <strong>Ley 25.326 de Protección de Datos Personales</strong>{' '}
          de la República Argentina.
        </p>

        <h2>1. Responsable del tratamiento</h2>
        <p>
          <strong>Huellitas Petshop</strong> — Mendoza, Argentina.<br />
          Email de contacto: <a href="mailto:marcelofernandez65.mf@gmail.com">marcelofernandez65.mf@gmail.com</a><br />
          WhatsApp: <a href="https://wa.me/5492616635666">+54 9 261 663-5666</a>
        </p>

        <h2>2. Datos que recopilamos</h2>
        <h3>Al crear una cuenta</h3>
        <ul>
          <li>Nombre y apellido</li>
          <li>Dirección de email</li>
          <li>Número de teléfono (opcional)</li>
          <li>Dirección de entrega</li>
        </ul>

        <h3>Al realizar un pedido (sin cuenta)</h3>
        <ul>
          <li>Nombre, email y teléfono para el seguimiento del pedido</li>
          <li>Dirección de entrega</li>
        </ul>

        <h3>Datos técnicos automáticos</h3>
        <ul>
          <li>Cookies de sesión para mantener tu inicio de sesión activo (cookies esenciales)</li>
          <li>Carrito de compras guardado en el almacenamiento local de tu navegador (<em>localStorage</em>)</li>
        </ul>

        <div className={styles.highlight}>
          <p>
            <strong>No usamos</strong> Google Analytics, Facebook Pixel ni ningún sistema de
            rastreo publicitario de terceros. Tu actividad en el sitio no es compartida con
            plataformas externas de publicidad.
          </p>
        </div>

        <h2>3. Uso de cookies</h2>
        <p>
          Usamos únicamente <strong>cookies esenciales</strong> para el funcionamiento del sitio:
        </p>
        <ul>
          <li>
            <strong>Cookies de sesión (sb-*)</strong>: las genera automáticamente Supabase Auth
            cuando iniciás sesión. Son <em>HTTP-only</em> (no accesibles por JavaScript),
            <em>SameSite=Lax</em> (protección contra CSRF) y se eliminan al cerrar sesión.
          </li>
          <li>
            <strong>localStorage — carrito</strong>: tu carrito se guarda localmente en tu
            dispositivo para no perder los items al cerrar el navegador. No se envía a nuestros
            servidores mientras no hagas un pedido.
          </li>
        </ul>
        <p>
          Al no usar cookies de seguimiento ni publicidad, no necesitamos mostrarte un banner
          de consentimiento de cookies más allá de esta información.
        </p>

        <h2>4. Finalidad del tratamiento</h2>
        <ul>
          <li>Gestionar tu cuenta y pedidos.</li>
          <li>Enviarte confirmaciones de compra y actualizaciones de estado.</li>
          <li>Contactarte ante incidencias con tu pedido.</li>
          <li>Cumplir con obligaciones legales y fiscales.</li>
        </ul>
        <p>
          <strong>No vendemos ni cedemos tus datos a terceros</strong> con fines comerciales.
          Sólo los compartimos con MercadoPago (procesador de pagos) en la medida necesaria
          para completar la transacción.
        </p>

        <h2>5. Almacenamiento y seguridad</h2>
        <p>
          Los datos se almacenan en <strong>Supabase</strong> (infraestructura en la nube con
          cifrado en tránsito TLS y en reposo). Las contraseñas nunca son almacenadas en texto
          plano — Supabase Auth usa hashing seguro (bcrypt).
        </p>
        <p>
          Conservamos tus datos mientras tengas una cuenta activa. Al solicitarlo, eliminamos
          tu cuenta y datos personales en un plazo de 30 días.
        </p>

        <h2>6. Tus derechos (Ley 25.326)</h2>
        <p>Tenés derecho a:</p>
        <ul>
          <li><strong>Acceder</strong> a los datos que tenemos sobre vos.</li>
          <li><strong>Rectificar</strong> datos incorrectos o desactualizados.</li>
          <li><strong>Eliminar</strong> tu cuenta y datos personales ("derecho al olvido").</li>
          <li><strong>Oponerte</strong> al uso de tus datos para determinados fines.</li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, contactanos por email a{' '}
          <a href="mailto:marcelofernandez65.mf@gmail.com">marcelofernandez65.mf@gmail.com</a>{' '}
          indicando tu nombre y el derecho que querés ejercer. Responderemos en un plazo máximo
          de 5 días hábiles.
        </p>

        <h2>7. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta Política ocasionalmente. Te notificaremos de cambios importantes
          por email o mediante un aviso visible en el Sitio.
        </p>
      </div>
    </main>
  );
}
