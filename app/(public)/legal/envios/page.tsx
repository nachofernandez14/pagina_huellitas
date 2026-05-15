import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Política de Envíos | Huellitas Petshop',
  description: 'Información sobre envíos, plazos de entrega y zona de cobertura de Huellitas Petshop.',
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

        <h2>1. Zona de cobertura</h2>
        <p>
          Por el momento realizamos envíos dentro de <strong>Mendoza Capital y Gran Mendoza</strong>.
          Si tu dirección está fuera de esta zona, contactanos por WhatsApp para evaluar opciones.
        </p>

        <h2>2. Métodos de entrega</h2>

        <h3>Envío a domicilio</h3>
        <p>
          Realizamos entrega a domicilio en el área de cobertura. El costo y plazo se informan
          al momento del checkout según tu dirección.
        </p>
        <ul>
          <li>Plazo estimado: <strong>24 a 48 horas hábiles</strong> desde la confirmación del pago.</li>
          <li>Te contactaremos por WhatsApp para coordinar el horario de entrega.</li>
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
          El costo de envío se calcula según la distancia al domicilio de entrega y se muestra
          claramente en el paso de checkout antes de confirmar el pago.
        </p>
        <p>
          <strong>Envío sin cargo</strong> en pedidos que superen el monto mínimo vigente
          (consultanos por WhatsApp para conocer el monto actualizado).
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

        <h2>6. Fuerza mayor</h2>
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
