# Plan de Correcciones — Fase 3 MP

Basado en auditoría `integration` del 2026-05-30.

## Decisiones (resueltas con doc MP)

| Tema | Decisión | Fundamento |
|------|----------|------------|
| **PKCE** | SKIP (Iteración 2 potencial) | Opcional según MP. SDK no expone `code_challenge`. Requiere activar en panel. Redirect HTTPS + code 10min = riesgo bajo. |
| **Idempotency-Key** | SKIP | No documentado para `/checkout/preferences`. Cada booking crea preference única → idempotencia natural. |
| **Statement Descriptor** | ADD | Documentado. Reduce chargebacks por "no reconozco el cargo". |
| **Binary Mode** | ADD | Solo approved/rejected. Simplifica flujo. MP advierte posible baja en aprobación, aceptable para hotelería. |
| **Payer surname** | ADD | MP espera `payer.surname`, no `last_name`. |
| **Rate limiter** | Appwrite DB | Sin dependencias externas. Increment counter por IP con TTL de 60s. |

## 🔴 Prioridad 0 — Bloqueantes (rotura funcional)

### 1. Bug en `createMercadoPagoPreference`
- **Archivo**: `lib/actions/public-payment.ts:64`
- **Problema**: `.then(res => console.log(res))` hace que `preference` sea `undefined`
- **Fix**: Eliminar el `.then(...)`, mantener `await` directo

### 2. Rate limiter no funciona en serverless
- **Archivo**: `lib/rate-limiter.ts`
- **Problema**: `Map` en memoria → por-instancia. En Vercel cada request puede ir a distinta instancia.
- **Implementación**: Appwrite Database. Colección `rate_limits` con documento por IP. Increment atómico + TTL de 60s.

### 3. Webhook registrado en panel MP
- **Acción**: Verificar que `save_webhook` ejecutado via MCP persiste en el panel.

## 🟠 Prioridad 1 — Seguridad y fraude

### 4. Agregar campos faltantes en Preference
- **Archivo**: `lib/actions/public-payment.ts:44-63`
- **Campos a agregar**:
  - `statement_descriptor: "SART BOOKING"`
  - `binary_mode: true`
  - En items: `description` con texto descriptivo de la reserva
  - En items: `category_id: "hotels"`
  - `payer.surname` desde el schema de entrada
  - Expandir `CreatePreferenceSchema` con `guestLastName` (opcional)

### 5. PKCE en OAuth — ❌ DIFERIDO DEFINITIVAMENTE
- **Motivo**: SDK `mercadopago` v3 NO expone `code_challenge`/`code_verifier` en tipos `AuthorizationRequest` ni `OAuthRequest`. Implementar requiere:
  - Activar PKCE en panel MP (se vuelve obligatorio)
  - Reemplazar `getAuthorizationURL()` con `fetch` manual a `auth.mercadopago.com/authorization`
  - Reemplazar `oauth.create()` con `fetch` manual a `api.mercadopago.com/oauth/token`
  - Esfuerzo alto, beneficio modesto (HTTPS + code 10min = riesgo bajo)
- **Decisión**: No lo hacemos.

### 6. Validación de timestamp en webhook (replay attack) ✅ HECHA
- **Archivo**: `app/api/webhooks/mercadopago/route.ts:76-80`
- **Implementación**: `|Date.now()/1000 - Number(ts)| > 300` → rechazar

### 7. Mover `NEXT_PUBLIC_MP_REDIRECT_URI` a servidor
- **Archivos**: `.env.local:27` + `lib/actions/mercadopago-oauth.ts:18,34`
- **Cambio**: Renombrar a `MP_REDIRECT_URI` (sin `NEXT_PUBLIC_`)
- **Solo usado en server action** → no necesita exponerse al cliente.

## 🟡 Prioridad 2 — Resiliencia y completitud

### 8. Idempotency-Key — DIFERIDO
- **Motivo**: No documentado para Preferences. Bajo valor.

### 9. Rate limiting en webhook endpoint ✅ HECHA
- **Archivo**: `app/api/webhooks/mercadopago/route.ts:10-14`
- **Implementación**: `checkRateLimit(ip)` al inicio del POST, 429 si excede.

### 10. Expandir manejo de eventos en webhook
- **Archivos**: `app/api/webhooks/mercadopago/route.ts` + `lib/actions/mercadopago-webhook.ts`
- **Implementación**:

  **10a. Refactor `route.ts`** — Reemplazar:
  ```ts
  if (payment.status !== "approved") { return received }
  ```
  Por dispatch:
  ```ts
  switch (payment.status) {
    case "approved"      → handleCompletedPayment(...)
    case "refunded"      → handleRefundedPayment(...)
    case "cancelled"     → handleCancelledPayment(...)
    case "charged_back"  → handleChargebackPayment(...)
    default              → log + received:true
  }
  ```

  **10b. `handleRefundedPayment(data)`**
  - Buscar PAGO original por `receipt`
  - Crear PAGO negativo (`amount: -data.amount`, `method: "MercadoPago-Refund"`)
  - Recalcular `pagoAbonado`
  - Si `<= 0` → `estado: "Pendiente"`, `paymentMethod: null`

  **10c. `handleCancelledPayment(data)`**
  - Log + notify admin
  - No modifica datos (nunca se completó)

  **10d. `handleChargebackPayment(data)`**
  - Log + alerta
  - Crear PAGO negativo
  - `pagoAbonado = 0`, `estado: "Pendiente"` (o `"Disputa"`)
  - Marcar para revisión manual

  **10e. Topics en MP** — Ya tenemos `payment` + `topic_chargebacks_wh`. No hace falta cambiar.

### 11. Datos completos del payer en MP
- **Archivo**: `lib/actions/public-payment.ts`
- **🐛 Bug detectado**: `bookingDoc.nombre` no existe en Reserva. El nombre real está en HUESPED (`bookingDoc.huesped` → guest ID). Actualmente `guestName = ""` → `payer.name` y `payer.surname` vacíos.
- **Implementación**:

  **11a. Fix — fetch HUESPED** — Reemplazar:
  ```ts
  const guestName = (bookingDoc.nombre as string) || ""
  const nameParts = guestName.trim().split(/\s+/)
  const payerName = nameParts[0] || ""
  const payerSurname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""
  ```
  Por fetch real del HUESPED:
  ```ts
  const COLL_HUESPED = process.env.NEXT_APPWRITE_COLLECTION_HUESPED_ID!
  const guestId = bookingDoc.huesped
  let payerName = "", payerSurname = "", guestPhone = "", guestDocType = "", guestDocNumber = ""

  if (guestId) {
    const guestDoc = await databases.getDocument(DATABASE_ID, COLL_HUESPED, guestId)
    const fullName = (guestDoc.nombre as string) || ""
    const nameParts = fullName.trim().split(/\s+/)
    payerName = nameParts[0] || ""
    payerSurname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""
    guestPhone = (guestDoc.telefono as string) || ""
    guestDocType = (guestDoc.tipoDocumento as string) || ""
    guestDocNumber = (guestDoc.numeroDocumento as string) || ""
  }
  ```

  **11b. Expandir `payer`**:
  ```ts
  payer: {
    email: guestEmail || "",
    name: payerName,
    surname: payerSurname,
    ...(guestPhone && { phone: { area_code: "", number: guestPhone } }),
    ...(guestDocType && guestDocNumber && { identification: { type: guestDocType, number: guestDocNumber } }),
  },
  ```
  - `phone.area_code` vacío porque el teléfono puede venir en formato internacional
  - Si no hay HUESPED (booking legacy) → solo email, name="", surname="" (MP acepta payer vacío)

  **11c. Schema (`_validation.ts`)** — Sin cambios. `CreatePreferenceSchema` sigue mínimo (bookingId + guestEmail). Datos del guest se obtienen de DB.

- **Comportamiento final**: Se envían a MP todos los datos disponibles del huésped (name, surname, email, phone, identification).

### 12. Renovación automática de tokens OAuth
- **Problema**: `mp_refresh_token` almacenado en user prefs pero nunca usado. Access tokens expiran cada ~180 días → `createMercadoPagoPreference` falla con 401.
- **Enfoque**: Refresh inline al usar el token (no Appwrite Function por ahora).

  **12a. Nuevo archivo**: `lib/actions/mercadopago-refresh.ts`
  ```ts
  "use server"
  import { MercadoPagoConfig, OAuth } from "mercadopago"
  import { createAdminClient } from "@/lib/server/appwrite"

  export async function ensureMpTokenValid(userId: string): Promise<boolean> {
    const { users } = await createAdminClient()
    const user = await users.get(userId)
    const prefs = user.prefs || {}
    const { mp_access_token, mp_refresh_token, mp_connected_at } = prefs

    if (!mp_access_token) return false
    if (!mp_refresh_token || !mp_connected_at) return true
    const daysSince = (Date.now() - new Date(mp_connected_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 150) return true  // buffer 30d antes de expirar

    try {
      const tokens = await new OAuth(new MercadoPagoConfig({ accessToken: process.env.MP_PLATFORM_ACCESS_TOKEN! }))
        .refresh({
          body: {
            client_secret: process.env.MP_CLIENT_SECRET!,
            client_id: process.env.MP_CLIENT_ID!,
            refresh_token: mp_refresh_token,
          },
        })
      await users.updatePrefs(userId, {
        mp_access_token: tokens.access_token,
        mp_refresh_token: tokens.refresh_token || mp_refresh_token,
        mp_user_id: String(tokens.user_id) || prefs.mp_user_id,
        mp_connected_at: new Date().toISOString(),
      })
      return true
    } catch (error) {
      console.error(`[MP Refresh] Failed user ${userId}:`, error)
      return false
    }
  }
  ```

  **12b. Integrar en `public-payment.ts`** — Antes del throw "no conectó MP":
  ```ts
  import { ensureMpTokenValid } from "./mercadopago-refresh"
  // ...
  if (mpAccessToken) await ensureMpTokenValid(bookingDoc.userId)
  // Re-fetch prefs tras posible refresh
  const updatedUser = await users.get(bookingDoc.userId)
  const finalToken = (updatedUser.prefs || {}).mp_access_token
  if (!finalToken) throw ...
  ```

  **12c. Futuro (no implementar ahora): Appwrite Function**
  - Schedule cada 24h que recorre users con `mp_refresh_token`
  - Llama `ensureMpTokenValid` por cada uno
  - Log de resultados
  - Requiere Appwrite CLI + Dockerfile + deploy manual

### 13. Quality Evaluation con payment real
- **No requiere código nuevo**. Post-fix audit usando MCP tool.
- **Prerrequisitos**:
  1. Tener un payment real de MP (reserva completada con Checkout Pro)
  2. Tener `application_id` (via MCP `application_list`)
- **Ejecutar**: `mercadopago-mcp-server_quality_evaluation({ payment_id, application_id, product: "checkout", platform: "not_platform", is_ca: false, lang: "es" })`
- **Output**: Checklist de campos evaluados + recomendaciones + score
- **Post-evaluación**: Iterar sobre issues reportados

## ✅ HECHO (Iteración 1)
- [1] Fix `.then()` bug → `public-payment.ts`
- [4] Fraud fields → `statement_descriptor`, `binary_mode`, `description`, `category_id`, `payer.surname`
- [6] Timestamp validation → `route.ts`
- [2] Rate limiter Appwrite DB → `lib/rate-limiter.ts` + colección `rate_limits`
- [9] Rate limiter en webhook → `route.ts`
- [3] Webhook registrado → topics `payment`, `topic_chargebacks_wh`, etc.
- `MP_WEBHOOK_SECRET` actualizado → `443c5275...`

## ✅ HECHO (Iteración 2)
- [7] `NEXT_PUBLIC_MP_REDIRECT_URI` → `MP_REDIRECT_URI` (`.env.local`, `mercadopago-oauth.ts`)
- [10] Webhook dispatch por `payment.status` (`route.ts`):
  - `approved` → `handleCompletedPayment`
  - `refunded`/`partially_refunded` → `handleRefundedPayment` (crea PAGO negativo, recalcula pagoAbonado, si ≤0 → "Pendiente")
  - `cancelled` → `handleCancelledPayment` (log only)
  - `charged_back` → `handleChargebackPayment` (crea PAGO negativo, pagoAbonado=0, estado="Disputa")
- `body.type === "topic_chargebacks_wh"` → log + received:true (sin auto-procesar)
- `"Disputa"` agregado al tipo `estado` en `lib/definitions.ts`

## ✅ HECHO (Iteración 3)
- [11] Fix payer: fetch HUESPED en vez de `bookingDoc.nombre`; expand `payer.phone` + `payer.identification`
- [12] `lib/actions/mercadopago-refresh.ts` — `ensureMpTokenValid()` refresh inline a los 150 días
- [12] Integrado en `public-payment.ts` — se llama antes de crear preference

## ⏳ PENDIENTE
- [13] Quality Evaluation vía MCP — requiere payment real para ejecutar

## 📋 Orden de ejecución

```
Iteración 1 (urgente) — COMPLETADA ✅
Iteración 2 (seguridad) — COMPLETADA ✅
Iteración 3 (completitud) — COMPLETADA ✅ (excepto [13])

Pendiente:
  [13] Quality Evaluation con payment real
```
