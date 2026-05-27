import nodemailer from 'nodemailer';
import type { CartItem } from '@/types';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function emailLayout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:#2d6a4f;padding:24px 40px;text-align:center;">
        <span style="color:#fff;font-size:20px;font-weight:700;">🐾 Huellitas Petshop</span>
      </td></tr>
      <tr><td style="padding:36px 40px 28px;">${bodyHtml}</td></tr>
      <tr><td style="background:#f9f9f9;padding:18px 40px;text-align:center;border-top:1px solid #eee;">
        <p style="margin:0;font-size:12px;color:#aaa;">Huellitas Petshop · Mendoza, Argentina</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function productRows(items: CartItem[]) {
  return items.map(i =>
    `<tr>
      <td style="padding:6px 0;font-size:14px;color:#222;">${i.nombre}${i.kg ? ` <span style="color:#888;">(${i.kg})</span>` : ''}</td>
      <td style="padding:6px 0;font-size:14px;color:#555;text-align:center;">x${i.quantity}</td>
      <td style="padding:6px 0;font-size:14px;color:#222;text-align:right;">${formatPrice(i.precio * i.quantity)}</td>
    </tr>`
  ).join('');
}

const ESTADO_LABELS: Record<string, string> = {
  paid:      'Pago confirmado',
  preparing: 'En preparación',
  ready:     'Listo para retirar',
  shipped:   'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

// Estados que disparan email al cliente
export const ESTADOS_CON_EMAIL = new Set(['paid', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled']);


export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await transporter.sendMail({
    from: `"Huellitas Petshop" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Recuperá tu contraseña — Huellitas Petshop',
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background:#2d6a4f;padding:28px 40px;text-align:center;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">🐾 Huellitas Petshop</span>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;font-weight:700;">Recuperá tu contraseña</h1>
                    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
                      Recibimos una solicitud para restablecer la contraseña de tu cuenta en Huellitas Petshop.
                      Hacé clic en el botón para elegir una nueva contraseña.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                      <tr>
                        <td style="background:#2d6a4f;border-radius:8px;">
                          <a href="${resetLink}" target="_blank"
                            style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                            Restablecer contraseña
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">
                      Si no solicitaste este cambio, podés ignorar este email. Tu contraseña actual seguirá siendo la misma.
                    </p>
                    <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
                      El link tiene una validez de <strong>24 horas</strong>.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
                    <p style="margin:0;font-size:12px;color:#aaa;">
                      Huellitas Petshop · Mendoza, Argentina
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Recuperá tu contraseña de Huellitas Petshop\n\nHacé clic en este link para elegir una nueva contraseña:\n${resetLink}\n\nSi no solicitaste este cambio, ignorá este email.\nEl link vence en 24 horas.`,
  });
}

// ─── Email: confirmación de pedido ─────────────────────────────────────────

export async function sendOrderConfirmationEmail(params: {
  to: string;
  nombre: string | null;
  orderId: string;
  items: CartItem[];
  total: number;
  tipoEntrega: 'retiro' | 'envio' | null;
  zona?: string | null;
  direccion?: string | null;
  formaPago?: string | null;
}) {
  const { to, nombre, orderId, items, total, tipoEntrega, zona, direccion, formaPago } = params;
  const shortId = orderId.slice(0, 8).toUpperCase();

  const entregaHtml = tipoEntrega === 'envio'
    ? `<p style="margin:4px 0;font-size:14px;color:#555;">📦 Envío a domicilio${zona ? ` · Zona: <strong>${zona}</strong>` : ''}${direccion ? `<br><span style="color:#888;">Dirección: ${direccion}</span>` : ''}</p>`
    : `<p style="margin:4px 0;font-size:14px;color:#555;">🏪 Retiro en sucursal</p>`;

  const pagoHtml = formaPago === 'efectivo'
    ? `<p style="margin:4px 0;font-size:14px;color:#555;">💵 Pago en efectivo${tipoEntrega === 'envio' ? ' al recibir' : ' en el local'}</p>`
    : `<p style="margin:4px 0;font-size:14px;color:#555;">💳 Pago con MercadoPago</p>`;

  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#1a1a1a;font-weight:700;">¡Pedido recibido!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#555;">Hola${nombre ? ` <strong>${nombre}</strong>` : ''}, recibimos tu pedido correctamente.</p>
    <div style="background:#f7faf8;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Número de pedido</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#2d6a4f;">#${shortId}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-top:1px solid #eee;">
      <tr>
        <th style="padding:8px 0;font-size:12px;color:#888;text-align:left;font-weight:600;text-transform:uppercase;">Producto</th>
        <th style="padding:8px 0;font-size:12px;color:#888;text-align:center;font-weight:600;text-transform:uppercase;">Cant.</th>
        <th style="padding:8px 0;font-size:12px;color:#888;text-align:right;font-weight:600;text-transform:uppercase;">Subtotal</th>
      </tr>
      ${productRows(items)}
      <tr style="border-top:2px solid #2d6a4f;">
        <td colspan="2" style="padding:10px 0 0;font-size:15px;font-weight:700;color:#1a1a1a;">Total</td>
        <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#2d6a4f;text-align:right;">${formatPrice(total)}</td>
      </tr>
    </table>
    <div style="border-top:1px solid #eee;padding-top:16px;margin-bottom:8px;">
      ${entregaHtml}
      ${pagoHtml}
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:#888;">Te vamos a avisar cuando tu pedido esté listo. Ante cualquier consulta podés escribirnos por WhatsApp.</p>
  `;

  await transporter.sendMail({
    from: `"Huellitas Petshop" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Pedido recibido #${shortId} — Huellitas Petshop`,
    html: emailLayout(`Pedido #${shortId}`, body),
    text: `Pedido recibido #${shortId}\n\nHola${nombre ? ` ${nombre}` : ''}, recibimos tu pedido.\nTotal: ${formatPrice(total)}\nEntrega: ${tipoEntrega === 'envio' ? 'Envío a domicilio' : 'Retiro en sucursal'}\n\nAnte consultas, escribinos por WhatsApp.`,
  });
}

// ─── Email: cambio de estado ────────────────────────────────────────────────

export async function sendOrderStatusEmail(params: {
  to: string;
  nombre: string | null;
  orderId: string;
  estado: string;
  tipoEntrega: 'retiro' | 'envio' | null;
}) {
  const { to, nombre, orderId, estado, tipoEntrega } = params;
  const shortId = orderId.slice(0, 8).toUpperCase();
  const label = ESTADO_LABELS[estado] ?? estado;

  const mensajes: Record<string, string> = {
    paid:      'Tu pago fue confirmado y ya estamos procesando tu pedido.',
    preparing: 'Estamos preparando tu pedido. En breve estará listo.',
    ready:     'Tu pedido está listo para retirar en el local. ¡Te esperamos!',
    shipped:   'Tu pedido está en camino. Pronto llegará a tu domicilio.',
    delivered: '¡Tu pedido fue entregado! Esperamos que lo disfrutes.',
    cancelled: 'Tu pedido fue cancelado. Ante cualquier consulta contactanos por WhatsApp.',
  };

  const mensaje = mensajes[estado] ?? 'El estado de tu pedido fue actualizado.';

  const iconos: Record<string, string> = {
    paid: '✅', preparing: '🔧', ready: '🏪', shipped: '🚚', delivered: '🎉', cancelled: '❌',
  };
  const icono = iconos[estado] ?? '📦';

  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#1a1a1a;font-weight:700;">${icono} ${label}</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#555;">Hola${nombre ? ` <strong>${nombre}</strong>` : ''}, te contamos la novedad de tu pedido.</p>
    <div style="background:#f7faf8;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Pedido</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#2d6a4f;">#${shortId}</p>
    </div>
    <p style="font-size:15px;color:#333;line-height:1.6;">${mensaje}</p>
    ${estado === 'ready' && tipoEntrega === 'retiro' ? '<p style="font-size:14px;color:#555;">📍 Retiralo en nuestra sucursal en Mendoza.</p>' : ''}
    <p style="margin:20px 0 0;font-size:13px;color:#888;">Ante cualquier consulta podés escribirnos por WhatsApp.</p>
  `;

  await transporter.sendMail({
    from: `"Huellitas Petshop" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${icono} ${label} — Pedido #${shortId} · Huellitas Petshop`,
    html: emailLayout(label, body),
    text: `${label} — Pedido #${shortId}\n\n${mensaje}\n\nAnte consultas, escribinos por WhatsApp.`,
  });
}

// ─── Email: confirmación de cuenta al registrarse ─────────────────────────

export async function sendConfirmationEmail(to: string, nombre: string, confirmationUrl: string) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;color:#1a1a1a;font-weight:700;">Confirmá tu cuenta 🐾</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.6;">
      Hola <strong>${nombre}</strong>, gracias por registrarte en <strong>Huellitas Petshop</strong>.<br>
      Hacé clic en el botón para activar tu cuenta y empezar a comprar.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#18D860;border-radius:8px;">
          <a href="${confirmationUrl}"
             style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
            Confirmar mi cuenta
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">
      Si el botón no funciona, copiá y pegá este enlace en tu navegador:
    </p>
    <p style="margin:0 0 20px;font-size:12px;color:#18D860;word-break:break-all;">${confirmationUrl}</p>
    <p style="margin:0;font-size:13px;color:#aaa;">
      Si no creaste esta cuenta, podés ignorar este email.
    </p>
  `;

  await transporter.sendMail({
    from: `"Huellitas Petshop" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Confirmá tu cuenta — Huellitas Petshop',
    html: emailLayout('Confirmá tu cuenta', body),
    text: `Hola ${nombre}!\n\nConfirmá tu cuenta en Huellitas Petshop haciendo clic en este link:\n${confirmationUrl}\n\nSi no creaste esta cuenta, ignorá este email.`,
  });
}

// ─── Email: bienvenida al registrarse ──────────────────────────────────────

export async function sendWelcomeEmail(to: string, nombre: string) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;color:#1a1a1a;font-weight:700;">¡Bienvenido/a, ${nombre}! 🎉</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.6;">
      Tu cuenta en <strong>Huellitas Petshop</strong> ya está lista. Ahora podés explorar nuestros productos, hacer pedidos y gestionar todo desde tu perfil.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#18D860;border-radius:8px;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/productos"
             style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
            Ver productos
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#888;line-height:1.5;">
      Si tenés alguna consulta, podés escribirnos por WhatsApp o responder este email.
    </p>
  `;

  await transporter.sendMail({
    from: `"Huellitas Petshop" <${process.env.GMAIL_USER}>`,
    to,
    subject: '¡Bienvenido/a a Huellitas Petshop!',
    html: emailLayout('Bienvenida', body),
    text: `¡Bienvenido/a ${nombre}!\n\nTu cuenta en Huellitas Petshop ya está lista.\nVisitanos en: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/productos`,
  });
}

