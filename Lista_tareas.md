Lista de Tareas. (No pases a la siguiente tarea hasta terminar con una y que no queden errores por resolver de esa tarea)

##  SOLUCION DE ERRORES - 

## 📋 FUNCIONALIDADES POR AGREGAR (Pendientes):

- [ ] Ejecutar `supabase/migrations/20261024_checkout_security.sql` en el SQL Editor de Supabase (prod + preview).
- [ ] Configurar el webhook en Mercado Pago → apunta a `https://<dominio>/api/payments/webhook` con `MP_WEBHOOK_SECRET` en Vercel.
- [ ] Probar en sandbox: pago aprobado / rechazado / duplicado / retorno sin webhook / conciliación admin.
- [ ] Cargar la tarea de limpieza automática de `checkout_email_codes` (o correr `purge_expired_checkout_codes()` con pg_cron).

## 📝 CAMBIOS REALIZADOS ÚLTIMO UPDATE:

### Checkout security hardening (rama `feature/checkout-security-hardening`)
- **Verificación de email para compras sin cuenta** [SFT]: código de 6 dígitos de un solo uso (hash en `checkout_email_codes`, 15 min, máx. 5 intentos) → token firmado HMAC 30 min que validan `create-preference` y `cash-order`. Las cuentas logueadas deben tener email confirmado. Endpoints: `/api/payments/verify-email` (+ `/confirm`), con Turnstile y rate limits (IP + email).
- **Pago MP verificado de punta a punta** [REH]: `markOrderPaid` es idempotente (webhook + return-page no duplican), verifica el monto contra la API de MP (`payment_received`, tolerancia $0.50) y guarda `payment_status` / `payment_verified_at`. Si el monto difiere, NO se marca pagado: queda flaggeado `amount_mismatch` para revisión.
- **Estados separados** [ISA]: columna `orders.payment_status` (pending/in_process/approved/rejected/cancelled/refunded/charged_back/cash_pending) desacoplada de `estado` (preparación/entrega). El webhook mapea todos los estados de MP con idempotencia.
- **Evidencia mínima por pedido** [IV]: tabla privada `order_events` (IP de proxy confiable, user-agent, eventos de pago/checkout). Visible solo en el panel admin (`/api/admin/orders/[id]/events`).
- **Rate limit atómico** [REH]: RPC `consume_rate_limit` (upsert atómico) reemplaza el read-then-update con race condition; fallback si la migración no corrió.
- **Conciliación admin** [RM]: `POST /api/admin/orders/reconcile` busca pagos aprobados en MP por external_reference para pedidos pendientes viejos (causa típica de `mp_payment_id = null`).
- **Guardia en panel** [SFT]: no se puede avanzar un pedido web a preparación/entrega si el pago MP no está verificado, salvo "Confirmar pago manual" (auditado en `order_events` + `audit_log`).
- **Búsqueda en panel** [SF]: por email, ID de pedido o ID de pago MP.
- **Privacidad actualizada**: sección de IP/user-agent, finalidad anti-fraude, retención 90 días, Ley 25.326.

## 📝 NOTAS:
- Siempre leer Global_rules.md y Vibe-coding_rules.md antes de empezar a trabajar
- Seguir reglas [AC], [DRY], [REH] en todo momento
- Commits frecuentes [CD]
- Verificar errores antes de siguiente tarea
- Mantener arquitectura limpia [CA]
