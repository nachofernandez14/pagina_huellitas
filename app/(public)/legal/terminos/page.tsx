import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos de uso de la tienda online Huellitas Petshop en Mendoza, Argentina.',
  alternates: { canonical: '/legal/terminos' },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Inicio</Link>
        <span className={styles.sep}>/</span>
        <span>Términos y Condiciones</span>
      </nav>

      <div className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Términos y Condiciones</h1>
        <p className={styles.updated}>Última actualización: mayo de 2026</p>
      </div>

      <div className={styles.content}>
        <p>
          Al acceder y utilizar el sitio web de <strong>Huellitas Petshop</strong> (en adelante,
          "el Sitio"), aceptás los presentes Términos y Condiciones. Si no estás de acuerdo,
          te pedimos que no utilices el Sitio.
        </p>

        <h2>1. Sobre nosotros</h2>
        <p>
          Huellitas Petshop es un comercio de venta de alimentos, accesorios y productos para mascotas
          ubicado en Mendoza, Argentina. Podés contactarnos por WhatsApp al{' '}
          <a href="https://wa.me/5492616635666">+54 9 261 663-5666</a> o por email a{' '}
          <a href="mailto:marcelofernandez65.mf@gmail.com">marcelofernandez65.mf@gmail.com</a>.
        </p>

        <h2>2. Uso del sitio</h2>
        <p>
          Al usar el Sitio te comprometés a:
        </p>
        <ul>
          <li>Brindar información veraz al registrarte o realizar un pedido.</li>
          <li>No usar el Sitio para fines fraudulentos, ilegales o perjudiciales.</li>
          <li>No intentar acceder a áreas restringidas sin autorización.</li>
          <li>No reproducir ni distribuir el contenido del Sitio sin permiso expreso.</li>
        </ul>

        <h2>3. Productos y precios</h2>
        <p>
          Los precios están expresados en pesos argentinos (ARS) e incluyen IVA. Nos reservamos
          el derecho de modificar los precios sin previo aviso. En caso de error de precio evidente,
          nos comunicaremos con vos antes de procesar el pedido.
        </p>
        <p>
          Las imágenes de los productos son de carácter ilustrativo. El stock está sujeto a
          disponibilidad real; si un producto no estuviera disponible, te avisaremos a la brevedad.
        </p>

        <h2>4. Disponibilidad de stock y política en caso de falta de producto</h2>
        <p>
          La disponibilidad de los productos publicados en Huellitas Petshop está sujeta al movimiento
          diario del inventario. Por lo tanto, alguno de los productos seleccionados puede no encontrarse
          en stock al momento de preparar la orden efectuada por el usuario.
        </p>
        <p>
          <strong>En caso de falta de stock:</strong> Nos comunicaremos con vos dentro de las próximas horas 
          para informarte de la situación. Tenemos dos opciones:
        </p>
        <ul>
          <li>
            <strong>Esperar el reabastecimiento:</strong> Solicitamos el producto al proveedor y aproximadamente 
            en <strong>48 horas</strong> tenemos el alimento disponible para ser enviado.
          </li>
          <li>
            <strong>Ofrecerte un producto similar:</strong> Dentro del mismo rango de precio y calidad, 
            te sugerimos una alternativa del mismo tipo de alimento o marca similar.
          </li>
        </ul>
        <p>
          Si ninguna opción te conviene, procederemos al <strong>reintegro del valor abonado</strong> a través 
          del mismo medio de pago utilizado.
        </p>

        <h2>5. Política de envíos</h2>
        <p>
          <strong>Zonas de cobertura y costos:</strong>
        </p>
        <ul>
          <li><strong>Zonas cercanas al local (Mendoza):</strong> Envío <strong>GRATIS</strong></li>
          <li><strong>Gran Mendoza:</strong> <strong>$1.500</strong></li>
          <li><strong>Otras zonas más lejanas:</strong> Consultar (evaluamos según distancia y disponibilidad)</li>
        </ul>
        <p>
          <strong>Plazos de entrega:</strong> Los envíos se realizan el <strong>mismo día</strong> o dentro de las 
          <strong> próximas 24 a 48 horas</strong> (máximo 2 días) posteriores a la confirmación del pago, 
          dependiendo del volumen de pedidos y la zona de entrega. El repartidor se comunicará con vos por 
          WhatsApp para coordinar el horario y avisarte cuándo sale a llevar tu pedido.
        </p>
        <p>
          <strong>Retiro en local:</strong> Sin costo adicional. Disponible dentro de 2 horas hábiles de confirmado 
          el pago.
        </p>

        <h2>6. Precios y promociones</h2>
        <p>
          Los precios de los artículos y promociones que figuran en la tienda online pueden diferir de
          los ofrecidos en el local físico, así como la variedad de artículos disponibles. Nos reservamos
          el derecho de actualizar precios y promociones sin previo aviso.
        </p>

        <h2>7. Proceso de compra</h2>
        <p>
          El proceso de compra se completa cuando:
        </p>
        <ol>
          <li>Agregás productos al carrito.</li>
          <li>Completás los datos de entrega.</li>
          <li>Realizás el pago a través de MercadoPago (tarjetas, transferencia, efectivo).</li>
          <li>Recibís la confirmación de pago en pantalla y por email.</li>
        </ol>
        <p>
          El pedido queda confirmado únicamente una vez que el pago es acreditado exitosamente.
        </p>

        <h2>8. Cancelaciones, devoluciones y cambios</h2>
        <h3>Cancelación</h3>
        <p>
          Podés cancelar tu pedido dentro de las <strong>2 horas</strong> posteriores a la compra
          contactándonos por WhatsApp. Pasado ese tiempo, si el pedido ya está preparado o en camino,
          no podremos cancelarlo.
        </p>

        <h3>Devoluciones y cambios</h3>
        <p>
          Aceptamos devoluciones o cambios únicamente de forma <strong>presencial en nuestro local</strong>
          en los siguientes casos:
        </p>
        <ul>
          <li>Producto en mal estado o vencido al momento de la entrega.</li>
          <li>Producto incorrecto enviado por error nuestro.</li>
        </ul>
        <p>
          <strong>Procedimiento:</strong> Contactanos por WhatsApp dentro de las <strong>24 horas</strong>
          de recibido el pedido para informar el inconveniente. Luego acercate al local con el producto,
          su embalaje original y el número de pedido. En el lugar evaluamos el caso y resolvemos el cambio,
          la reparación o el reintegro según corresponda.
        </p>
        <p>
          No realizamos devoluciones a domicilio ni reembolsos sin antes haber visto el producto
          en el local. Esta política nos permite asegurarnos de que todo esté en orden y darte
          una solución en el momento.
        </p>

        <h4>Reintegro según medio de pago</h4>
        <p>
          Todos los pagos online se procesan a través de <strong>Mercado Pago</strong>. Por eso, 
          el reintegro de los importes abonados con <strong>tarjeta de crédito, débito, 
          transferencia o Mercado Pago</strong> se gestiona directamente desde nuestra cuenta de 
          Mercado Pago, y la plataforma se encarga de acreditarlo al cliente según sus tiempos y 
          políticas. No manejamos efectivo ni hacemos devoluciones en mano de pagos virtuales, 
          ya que la transacción fue procesada por un tercero.
        </p>
        <p>
          En cambio, si el pago se realizó en <strong>efectivo</strong> en el local, el reintegro 
          se hace en el momento, también en efectivo, al presentar el producto y el comprobante 
          de compra.
        </p>

        <h2>9. Derecho de arrepentimiento y garantía legal</h2>
        <p>
          Como consumidor, te ampara la <strong>Ley 24.240 de Defensa del Consumidor</strong> de la 
          República Argentina. A continuación detallamos cómo aplica en nuestras compras.
        </p>

        <h3>Derecho de arrepentimiento (art. 34 Ley 24.240)</h3>
        <p>
          El cliente podrá ejercer el derecho de arrepentimiento dentro de los <strong>10 días 
          corridos</strong> desde la recepción del producto, comunicándose previamente con 
          Huellitas Petshop para coordinar la devolución.
        </p>

        <h4>Excepciones</h4>
        <p>
          No se acepta el derecho de arrepentimiento en los siguientes casos (art. 34, párr. 3°):
        </p>
        <ul>
          <li>
            <strong>Productos sellados que hayan sido abiertos</strong> una vez entregados, como 
            alimentos de mascotas, piedras sanitarias, bolsas de arena o cualquier otro producto que 
            por razones de higiene o salubridad no pueda ser revendido una vez abierto.
          </li>
          <li>
            Productos que hayan sido <strong>usados, dañados o alterados</strong> por el cliente 
            después de la entrega.
          </li>
        </ul>

        <h3>Garantía legal</h3>
        <p>
          Los productos cuentan con la garantía legal prevista por la normativa aplicable según 
          su naturaleza.
        </p>

        <h2>10. Privacidad y protección de datos</h2>
        <p>
          En <strong>Huellitas Petshop</strong> tratamos tus datos personales con responsabilidad y
          transparencia. Al registrarte o realizar un pedido, recopilamos la información necesaria
          para procesar tu compra (nombre, email, teléfono, dirección de entrega) y gestionar tu cuenta.
          Estos datos se almacenan de forma segura y nunca son vendidos ni cedidos a terceros con fines
          comerciales. Para conocer todos los detalles sobre el tratamiento de tus datos personales,
          incluyendo tus derechos de acceso, rectificación y eliminación, consultá nuestra{' '}
          <Link href="/legal/privacidad">Política de Privacidad</Link>.
        </p>

        <h2>11. Limitación de responsabilidad</h2>
        <p>
          Huellitas Petshop no se responsabiliza por daños indirectos derivados del uso del Sitio
          ni por interrupciones del servicio fuera de nuestro control (fallas de internet, cortes de
          luz, problemas con proveedores de pago, etc.).
        </p>

        <h2>12. Propiedad intelectual</h2>
        <p>
          Todo el contenido del Sitio (textos, diseño, logo) es propiedad de Huellitas Petshop
          y está protegido. Queda prohibida su reproducción total o parcial sin autorización escrita.
        </p>

        <h2>13. Imágenes de productos</h2>
        <p>
          Las imágenes que aparecen en el Sitio junto a los productos son de carácter{' '}
          <strong>meramente ilustrativo</strong>. Pueden no representar con exactitud la presentación,
          tamaño, embalaje o variante específica del artículo entregado. Únicamente el logotipo de{' '}
          <strong>Huellitas Petshop</strong> es propiedad exclusiva del comercio; las demás imágenes
          pueden pertenecer a sus respectivos fabricantes o proveedores.
        </p>

        <h2>14. Modificaciones</h2>
        <p>
          Podemos actualizar estos Términos en cualquier momento. Los cambios entran en vigencia
          al publicarse en el Sitio. El uso continuado implica aceptación de los nuevos términos.
        </p>

        <h2>15. Ley aplicable</h2>
        <p>
          Estos Términos se rigen por las leyes de la República Argentina. Cualquier controversia
          se someterá a la jurisdicción de los tribunales ordinarios de la ciudad de Mendoza.
        </p>

        <div className={styles.highlight}>
          <p>
            ¿Tenés alguna duda? Contactanos por{' '}
            <a href="https://wa.me/5492616635666">WhatsApp</a> o escribinos a{' '}
            <a href="mailto:marcelofernandez65.mf@gmail.com">marcelofernandez65.mf@gmail.com</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
