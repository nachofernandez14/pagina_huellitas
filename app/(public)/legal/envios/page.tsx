import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Política de Envíos en Mendoza y Gran Mendoza',
  description:
    'Envíos a domicilio en Mendoza, Guaymallén y Las Heras. Costos, plazos 24–48 hs y retiro en Rodeo de la Cruz. Huellitas Petshop.',
  alternates: { canonical: '/legal/envios' },
  openGraph: {
    title: 'Política de Envíos | Huellitas Petshop Mendoza',
    description: 'Zonas de cobertura, costos y retiro en local en Mendoza.',
    url: '/legal/envios',
  },
};

export default function EnviosPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Inicio</Link>
        <span className={styles.sep}>/</span>
        <span>Política de Envíos</span>
      </nav>

      <div className={styles.header}>
        <span className={styles.badge}>Envíos</span>
        <h1 className={styles.title}>Política de Envíos</h1>
        <p className={styles.updated}>Última actualización: mayo de 2026</p>
      </div>

      <div className={styles.content}>
        <p>
          Queremos que tu pedido llegue rápido y en perfectas condiciones. Acá te explicamos
          todo lo que necesitás saber sobre los envíos de <strong>Huellitas Petshop</strong>.
        </p>

        <h2>1. Zona de cobertura y costos</h2>
        <p>
          Realizamos envíos en Mendoza. Los costos varían según la distancia:
        </p>
        <ul>
          <li><strong>Zonas cercanas al local:</strong> <strong style={{color: '#00c853'}}>ENVÍO GRATIS</strong></li>
          <li><strong>Gran Mendoza:</strong> <strong>$1.500</strong></li>
          <li><strong>Otras zonas más lejanas:</strong> Consultá por WhatsApp para evaluar opciones</li>
        </ul>
        <p>
          Para localidades fuera de nuestro área habitual, nos comunicaremos para coordinar la mejor 
          solución (envío especial, retiro en local o acordar alternativas).
        </p>

        <h2>2. Métodos de entrega</h2>

        <h3>Envío a domicilio</h3>
        <p>
          Realizamos entrega a domicilio en el área de cobertura. 
        </p>
        <ul>
          <li><strong>Plazo:</strong> Los envíos se realizan dentro de las <strong>próximas 24 horas</strong> posteriores a la confirmación del pago.</li>
          <li><strong>Comunicación:</strong> El repartidor se comunicará con vos por WhatsApp para avisarte cuándo sale a entregar tu pedido y coordinar el horario.</li>
          <li><strong>Seguimiento en tiempo real:</strong> Estarás en contacto directo para saber exactamente cuándo llegará tu pedido.</li>
        </ul>

        <h3>Retiro en local</h3>
        <p>
          Podés retirar tu pedido sin costo adicional en nuestro local de Mendoza.
          El retiro estará disponible dentro de las <strong>2 horas hábiles</strong> de confirmado el pago.
        </p>

        <div className={styles.highlight}>
          <p>
            <strong>Horario de atención para retiros:</strong><br />
            Lunes a viernes: 9:00 – 13:15 hs y 16:45 – 20:30 hs<br />
            Sábados: 9:00 – 13:30 hs y 17:00 – 20:30 hs<br />
            Domingos: 10:00 – 13:00 hs
          </p>
        </div>

        <h2>3. Costo de envío</h2>
        <p>
          El costo de envío depende de la zona de entrega:
        </p>
        <ul>
          <li><strong>Zonas cercanas al local (Mendoza):</strong> <strong style={{color: '#00c853'}}>GRATIS</strong></li>
          <li><strong>Gran Mendoza:</strong> <strong>$1.500</strong></li>
          <li><strong>Otras zonas:</strong> Cotización especial (consultá por WhatsApp)</li>
        </ul>
        <p>
          El costo se muestra claramente en el paso de checkout antes de confirmar el pago.
        </p>

        <h2>4. Seguimiento del pedido</h2>
        <p>
          Una vez confirmado tu pago, podés ver el estado de tu pedido en la sección{' '}
          <Link href="/perfil">Mis pedidos</Link> (requiere cuenta).
          También podés consultarnos directamente por{' '}
          <a href="https://wa.me/5492616635666">WhatsApp</a>.
        </p>

        <h2>5. Problemas con la entrega</h2>
        <p>
          Si no estás en casa al momento de la entrega, nos comunicaremos para reprogramarla.
          Luego de 2 intentos fallidos, el pedido quedará disponible para retiro en local
          durante 5 días hábiles.
        </p>
        <p>
          Si el paquete llega dañado o el producto tiene algún problema, contactanos dentro de
          las <strong>24 horas</strong> con fotos al{' '}
          <a href="https://wa.me/5492616635666">WhatsApp</a> y lo solucionamos.
        </p>

        <h2>6. Disponibilidad de stock</h2>
        <p>
          Nos esforzamos por mantener nuestro inventario actualizado. Sin embargo, en ocasiones 
          algún producto puede no estar disponible al momento de procesar tu pedido.
        </p>
        <p>
          <strong>Si falta stock del producto que pediste:</strong>
        </p>
        <ul>
          <li>Nos comunicaremos con vos <strong>dentro de las próximas horas</strong> para explicar la situación.</li>
          <li><strong>Opción 1:</strong> Podemos solicitar el producto al proveedor y, aproximadamente en <strong>48 horas</strong>, tenemos el alimento disponible para enviar.</li>
          <li><strong>Opción 2:</strong> Te ofrecemos un producto similar de la misma marca o rango de precio como alternativa.</li>
          <li><strong>Opción 3:</strong> Si prefieres, devolvemos el dinero al mismo medio de pago que utilizaste.</li>
        </ul>

        <h2>7. Fuerza mayor</h2>
        <p>
          No nos responsabilizamos por demoras causadas por condiciones climáticas extremas,
          cortes de ruta u otras situaciones fuera de nuestro control. En estos casos,
          te avisaremos a la brevedad con una nueva fecha estimada.
        </p>

        <div className={styles.highlight}>
          <p>
            ¿Tenés preguntas sobre tu envío? Escribinos por{' '}
            <a href="https://wa.me/5492616635666">WhatsApp</a> —
            te respondemos rápido.
          </p>
        </div>
      </div>
    </main>
  );
}
