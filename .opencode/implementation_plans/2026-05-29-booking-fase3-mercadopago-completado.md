# Informe Fase 3 — Integración Mercado Pago (Completada)

Fecha: 2026-05-29
Plan base: `2026-05-27-booking-portal-unificado-completo.md`

---

## Resumen Ejecutivo

Se implementó el flujo completo de pagos online con Mercado Pago Checkout Pro (redirección) para el portal de reservas público. Build y lint pasan sin errores.

---

## 1. Arquitectura

### Decisión tomada: Tokens MP en user prefs
Los tokens de Mercado Pago (`mp_access_token`, `mp_refresh_token`, `mp_user_id`, `mp_connected_at`) se almacenan en **user prefs** de Appwrite (vía `users.updatePrefs()`), coherente con el resto de las property settings (`hotelName`, `propertySlug`, etc.). Se descartó usar una colección separada para evitar refactor mayor.

### Stack
- `mercadopago@3.0.0` (Node SDK oficial)
- `@mercadopago/sdk-react` (disponible si se necesita Wallet Brick)
- SDK ya incluye: `MercadoPagoConfig`, `Preference`, `OAuth`, `Payment`

---

## 2. Archivos Nuevos (7)

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `lib/rate-limiter.ts` | 21 | Rate limiter in-memory (10 req/min/IP) con limpieza cada 5 min |
| `lib/mercadopago.ts` | 5 | Singleton `MercadoPagoConfig` con `MP_PLATFORM_ACCESS_TOKEN` |
| `lib/actions/mercadopago-oauth.ts` | 57 | OAuth: `getMpAuthUrl()`, `handleMpCallback()`, `disconnectMp()` |
| `app/api/mercadopago/oauth/route.ts` | 26 | Callback OAuth (code → tokens → user prefs) |
| `lib/actions/mercadopago-webhook.ts` | 87 | `handleCompletedPayment()` — idempotente, crea PAGO, sync, actualiza estado |
| `app/api/webhooks/mercadopago/route.ts` | 94 | Webhook con validación `x-signature` HMAC-SHA256 |
| `lib/actions/public-payment.ts` | 72 | `createMercadoPagoPreference()` — rate limit + Zod + Preference dinámica |

## 3. Archivos Modificados (10)

| Archivo | Cambio principal |
|---------|-----------------|
| `lib/actions/public.ts` | + Zod validation + rate limit en `searchAvailableRooms` y `createPublicBooking`; userId leído de roomDoc (no del cliente) |
| `lib/actions/property.ts` | + `saveMpTokens()` para guardar tokens MP en user prefs |
| `checkout/page.tsx` | Split en 2 estados: formulario → booking creado → `MercadoPagoCheckoutButton` + "Reservar sin pagar" |
| `checkout/_hooks/useCheckoutForm.ts` | Retorna `bookingId` + `created` + `reset()` (ya no redirige automáticamente) |
| `confirmation/page.tsx` | Badge verde/ámbar según `paid` param, botón "Reintentar pago" si no pagó |
| `next.config.ts` | CSP: `*.mercadopago.com`, `*.mercadolibre.com`, `fonts.gstatic.com`, `api.mercadopago.com` |
| `app/api/webhooks/paddle/route.ts` | TransactionCompleted ignora booking (solo suscripciones) |
| `messages/es.json` | + keys: `bookingCreated`, `paymentHeading`, `redirecting`, `paidBadge`, `unpaidBadge`, `paymentReminder`, `pendingHeading` |
| `messages/en.json` | Mismas keys en inglés |
| `messages/pt.json` | Mismas keys en portugués |

## 4. Dependencias Agregadas

- `mercadopago@3.0.0` (Node SDK oficial de Mercado Pago)

---

## 5. Flujo de Pago Completo

```
Guest completa GuestInfoForm → handleSubmit()
  → createPublicBooking() ← Zod validation + rate limit + userId server-side
  → Booking creado como "Pendiente"
  → UI cambia a modo "created"
  → Guest elige:

  [Pagar seña del 30%]              [Reservar sin pagar ahora]
       ↓                                     ↓
  createMercadoPagoPreference()        redirect a
       ↓                               confirmation?paid=false
  Redirect a MP Checkout Pro
       ↓
  Guest paga en MP
       ↓
  MP redirige a:
  success → confirmation?paid=true
  failure → confirmation?paid=false
       ↓
  MP envía POST a /api/webhooks/mercadopago
       ↓
  1. Validar x-signature (HMAC-SHA256 + timingSafeEqual)
  2. Validar payment.status === 'approved'
  3. Leer bookingId de external_reference
  4. Idempotencia: check receipt duplicado en PAGO collection
  5. Crear PAGO document (method: 'MercadoPago')
  6. syncBookingTotalInternal()
  7. Actualizar estado → 'Confirmada'
  8. Si groupId: actualizar hermanas del grupo
```

---

## 6. Seguridad Implementada

| Medida | Implementación |
|--------|---------------|
| Rate limiting (10 req/min/IP) | `checkRateLimit(ip)` en `public.ts` y `public-payment.ts` |
| Zod validation server-side | `validateOrThrow(CreatePreferenceSchema)` y `PublicBookingDataSchema` |
| userId de DB (no del cliente) | `createPublicBooking` lee `roomDoc.userId` (fix crítico) |
| HMAC-SHA256 + timingSafeEqual | `verifyMpSignature()` en webhook |
| Idempotencia DB-backed | `handleCompletedPayment` verifica `receipt` duplicado |
| Validación de monto | Webhook compara `transaction_amount` vs depósito esperado |
| Sin PII en `external_reference` | Solo `bookingId` |
| OAuth state = userId (CSRF) | `state` parameter en `getAuthorizationURL` |
| CSP actualizado | MP domains en `form-action`, `frame-src`, `connect-src`, `img-src` |
| Sin marketplace_fee | 0% comisión SART — dinero directo al seller |

---

## 7. Estado del `.env.local`

| Variable | Estado | Requerido por |
|----------|--------|---------------|
| `MP_CLIENT_ID` | ✅ `3425674989` | OAuth + Preference |
| `MP_CLIENT_SECRET` | 🔴 VACÍA | OAuth `handleMpCallback` |
| `MP_PLATFORM_ACCESS_TOKEN` | ✅ `APP_USR-...` | Webhook + OAuth client |
| `MP_WEBHOOK_SECRET` | 🔴 VACÍA | Webhook HMAC validation |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | ✅ `APP_USR-...` | Frontend SDK |
| `NEXT_PUBLIC_MP_REDIRECT_URI` | 🔴 VACÍA | OAuth redirect |
| `NEXT_PUBLIC_MP_ENV` | ✅ `sandbox` | Entorno |
| `NEXT_PUBLIC_BOOKING_DEPOSIT_PERCENT` | ✅ `30` | Cálculo de seña |
| `APP_URL` | ✅ `https://sart.app` | Back urls + webhook |

---

## 8. Pendientes Externos

Antes de probar en producción o sandbox:

1. Obtener `MP_CLIENT_SECRET` del panel [Tus integraciones](https://mercadopago.com/developers/panel/app) (App ID: 7315042596722802)
2. Configurar **Redirect URI** en la App MP → `https://sart.app/api/mercadopago/oauth`
3. Configurar **Webhook** en la App MP → URL: `https://sart.app/api/webhooks/mercadopago` + evento **Payment** → copiar `MP_WEBHOOK_SECRET`
4. Completar `.env.local` con los valores anteriores
5. Verificar colección PAGO: campo `receipt` (String) con índice **Unique**
6. Verificar colección RESERVA: campos `pagoAbonado` (Double), `paymentMethod` (String), `groupId` (String)

---

## 9. Verificación de Build

```
pnpm build  → ✓ Compiled successfully (sin errores de tipos)
pnpm lint   → ✔ No ESLint warnings or errors
```

Rutas nuevas compiladas:
- `ƒ /api/mercadopago/oauth` ✅
- `ƒ /api/webhooks/mercadopago` ✅

---

## 10. Integración con Próximas Fases

| Fase | Dependencia de Fase 3 | Estado |
|------|----------------------|--------|
| Fase 4 (Seguridad) | Rate limit + Zod ya implementados en Fase 3 | Parcialmente cubierto |
| Fase 6 (Personalización) | Sección "Conectar Mercado Pago" en Settings requiere `getMpAuthUrl` + UI | Pendiente de UI |
