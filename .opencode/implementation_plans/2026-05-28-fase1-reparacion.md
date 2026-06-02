# Plan de Reparación — Fase 1 SART3

Consolidado de auditorías: frontend + arquitectura + explore + integración + seguridad + performance
Fecha: 2026-05-28

---

## 🔴 CRÍTICOS (3) — Fijar antes de continuar

### C1. Credenciales MP expuestas en tipo `PropertySettings`

| | |
|---|---|
| **Archivo** | `lib/definitions.ts:237-238` |
| **Problema** | `mp_access_token` y `mp_refresh_token` están en `PropertySettings`, que se referencia desde `context/AppContext` y componentes cliente. Cualquier spread de `prefs` filtraría tokens. |
| **Fix** | Separar en `PropertySettingsPublic` (sin tokens) y `PropertySettings` (con tokens, solo server). Crear helper `sanitizePrefs()`. |
| **Esfuerzo** | 🟢 15 min |

### C2. Price tampering vía `planTarifarioId`

| | |
|---|---|
| **Archivo** | `lib/actions/public.ts:194` |
| **Problema** | `createPublicBooking` acepta `planTarifarioId` del cliente y lo usa para calcular precio **sin verificar** que el plan pertenezca al `propertyUserId`. Un atacante podría usar un plan barato de otro hotel. |
| **Fix** | Agregar `planDoc.userId === propertyUserId` antes de usar el precio. Fallback a `roomDoc.precio * nights`. |
| **Esfuerzo** | 🟢 10 min |

### C3. Validación Zod no conectada al flujo real

| | |
|---|---|
| **Archivos** | `booking-url-params.ts`, `checkout/page.tsx`, `confirmation/page.tsx` |
| **Problema** | `parseCheckoutParams()`, `serializeCheckoutParams()`, `validateOrThrow()` están definidos pero **nunca importados**. El flujo lee URL params con `searchParams.get()` directo sin validación. |
| **Fix** | Crear schema unificado en `lib/_shared/schemas/booking.ts` (merge de `booking-schemas.ts` + `SearchRoomsSchema`). Reemplazar lecturas directas con `parseCheckoutParams()` y `parseConfirmationParams()`. Agregar `validateOrThrow()` en todas las server actions públicas. |
| **Esfuerzo** | 🟡 60 min |

## 🟠 ALTOS (12) — Siguiente prioridad

### A1. DayPicker con import estático (no dinámico)

| | |
|---|---|
| **Archivo** | `app/[locale]/book/[slug]/page.tsx:14-15` |
| **Impacto** | `react-day-picker` (~30KB gzipped) en bundle inicial aunque el calendario esté oculto |
| **Fix** | `const DayPicker = dynamic(() => import("react-day-picker").then(m => m.DayPicker), { ssr: false })` |
| **Esfuerzo** | 🟢 5 min |

### A2. Todas las páginas booking son `"use client"`

| | |
|---|---|
| **Archivos** | `page.tsx`, `results/page.tsx`, `checkout/page.tsx`, `confirmation/page.tsx` |
| **Impacto** | Sin Server Components en el árbol booking. Todo el JS se envía al cliente. Sin RSC optimization, sin streaming. |
| **Fix** | Dividir cada página en Server Component (wrapper estático) + Client Component (solo el interactivo). Pasar `property` desde layout como prop. |
| **Esfuerzo** | 🟡 45 min |

### A3. Data fetching duplicado — `getPropertyBySlug()` 2-3 veces

| | |
|---|---|
| **Archivos** | `layout.tsx` (2 veces), `page.tsx` (import muerto), `results/page.tsx` (useEffect), `checkout/page.tsx` (submit) |
| **Impacto** | Cada llamada escanea todos los usuarios Appwrite. TTFB se multiplica. |
| **Fix** | Layout obtiene `property` una vez y la pasa via contexto/prop a todos los children. Eliminar imports/efectos redundantes. |
| **Esfuerzo** | 🟡 30 min |

### A4. 6 Google Fonts precargadas en booking layout

| | |
|---|---|
| **Archivo** | `app/[locale]/book/[slug]/layout.tsx:8-15` |
| **Impacto** | Las 6 fuentes se descargan (~60-120KB) aunque solo se usen 1-2. LCP y CLS afectados. |
| **Fix** | Cargar solo 2-3 fuentes esenciales. Usar `display: 'swap'` (ya presente). |
| **Esfuerzo** | 🟢 5 min |

### A5. `checkout/page.tsx` envía `roomId` sin verificar ownership

| | |
|---|---|
| **Archivo** | `public.ts:186` |
| **Problema** | `createPublicBooking` obtiene `roomDoc` sin verificar que `roomDoc.userId === data.propertyUserId`. |
| **Fix** | Agregar verificación después de obtener `roomDoc`. Si no coincide, rechazar. |
| **Esfuerzo** | 🟢 10 min |

### A6. `ConfirmationParamsSchema.finalPrice` sin `max()`

| | |
|---|---|
| **Archivo** | `booking-schemas.ts:35` |
| **Problema** | `finalPrice: z.coerce.number().positive()` sin límite superior. |
| **Fix** | Agregar `.max(999999)`. |
| **Esfuerzo** | 🟢 2 min |

### A7. `SearchParamsSchema` sin regex en fechas

| | |
|---|---|
| **Archivo** | `booking-schemas.ts:4-5` |
| **Problema** | `checkIn/checkOut` usan `max(10)` sin validar formato. Cualquier string ≤10 chars pasa. |
| **Fix** | Agregar `.regex(/^\d{4}-\d{2}-\d{2}$/)` (consistente con `SearchRoomsSchema` en `_validation.ts`). |
| **Esfuerzo** | 🟢 2 min |

### A8. Env vars Paddle inconsistentes

| | |
|---|---|
| **Archivo** | `.env.example` vs `lib/paddle.ts` y `api/webhooks/paddle/route.ts` |
| **Problema** | `.env.example` declara `PADDLE_SUBSCRIPTION_API_KEY` pero el código usa `PADDLE_API_KEY` en `lib/paddle.ts:3`. Además, `NEXT_PUBLIC_PADDLE_ENV` fue eliminado de `.env.example` pero `lib/paddle.ts:4` lo lee — sin él, paddle siempre usa sandbox incluso en producción. |
| **Fix** | Actualizar `lib/paddle.ts` a `PADDLE_SUBSCRIPTION_API_KEY` y `NEXT_PUBLIC_PADDLE_SUBSCRIPTION_ENV`. Agregar ambas vars a `.env.example`. |
| **Esfuerzo** | 🟢 15 min |

### A9. `reserva-formulario.tsx` — valores no alineados con `Payment.method`

| | |
|---|---|
| **Archivo** | `components/app/reserva-formulario.tsx:704` |
| **Problema** | El array de métodos de pago incluye `'Tarjeta Crédito'`, `'Tarjeta Débito'`, `'PayPal'`, `'Stripe'` que NO existen en `Payment.method`. Fluyen vía `as any` en `bookings.ts:118`. |
| **Fix** | Reemplazar valores legacy por `'Tarjeta'` y `'Otro'`. Eliminar `as any` con mapeo explícito. |
| **Esfuerzo** | 🟡 20 min |

### A10. `_validation.ts` mezcla utilidad genérica con schemas específicos

| | |
|---|---|
| **Archivo** | `lib/actions/_validation.ts` |
| **Problema** | `validateOrThrow()` (utilidad genérica) + `SearchRoomsSchema` / `CreatePreferenceSchema` (schemas de dominio) en el mismo archivo. A medida que crezca será un cajón de sastre. |
| **Fix** | Mover `validateOrThrow()` a `lib/utils.ts`. Dejar schemas específicos en `_validation.ts` (renombrar a `_schemas.ts`). |
| **Esfuerzo** | 🟢 10 min |

### A11. `searchAvailableRooms` usa `new Date()` sin validar formato

| | |
|---|---|
| **Archivo** | `lib/actions/public.ts:33-34` |
| **Problema** | `new Date(checkIn)` con string inválido crea Invalid Date. `nights` se vuelve `NaN`, pero `NaN <= 0` es `false` → el guard `if (nights <= 0)` no lo atrapa. NaN fluye al precio final. |
| **Fix** | Validar con regex antes de convertir, o usar `SearchRoomsSchema` existente. |
| **Esfuerzo** | 🟢 10 min |

### A12. Type mismatch: `planDoc.precio` vs `PlanTarifario.valorAjuste`

| | |
|---|---|
| **Archivo** | `lib/actions/public.ts:197` |
| **Problema** | Se accede `planDoc.precio` pero el tipo `PlanTarifario` (`definitions.ts:198-205`) define `valorAjuste`. La colección Appwrite puede tener `precio`, pero el tipo TS está desactualizado. Si alguien agrega tipado estricto al fetch, rompe. |
| **Fix** | Agregar `precio` opcional a `PlanTarifario` o alinear la lectura con la colección real. |
| **Esfuerzo** | 🟢 10 min |

---

## 🟡 MEDIOS (14) — Mejora continua

| # | Issue | Archivo | Fix | Esfuerzo |
|---|-------|---------|-----|----------|
| M1 | `BookingThemeProvider` marca todo como client boundary | `booking-theme-provider.tsx` | Separar lógica pura (Server) del `useEffect` (Client) | 🟡 30 min |
| M2 | i18n Booking.* + Settings.* agregados pero no consumidos | `messages/*.json` | Usar `useTranslations('Booking')` en las páginas booking en vez de strings hardcoded | 🟡 30 min |
| M3 | `validateOrThrow()` lanza "Invalid input" genérico | `_validation.ts:8` | Incluir `result.error.format()` en el mensaje | 🟢 5 min |
| M4 | Payment.method duplicado en definitions.ts y formSchema | `definitions.ts` + `add-payment-dialog.tsx` | Crear `PAYMENT_METHODS` as const compartido | 🟢 10 min |
| M5 | `paymentToEdit.method as any` | `add-payment-dialog.tsx:97` | Tipar correctamente con `z.infer` o el enum compartido | 🟢 5 min |
| M6 | `z-[9999]` hardcodeado en SelectContent/PopoverContent | `add-payment-dialog.tsx:239,277` | Confiar en portal de Radix sin override | 🟢 5 min |
| M7 | `MercadoPago` visible en dialog incluso sin conexión MP | `add-payment-dialog.tsx:244` | Condicionar a prop `isMercadoPagoConnected` | 🟡 15 min |
| M8 | `Response<T>` no exportado | `definitions.ts:1` | Agregar `export` | 🟢 2 min |
| M9 | `Transaccion.metodoPago` sin `'MercadoPago'` | `definitions.ts:186` | Agregar al union type si aplica para PDV | 🟢 5 min |
| M10 | Sin rate limiting en endpoints públicos | `public.ts`, `public-payment.ts` | Implementar `checkRateLimit()` en todas las server actions públicas | 🟡 20 min |
| M11 | mp_* definidos pero no persistidos ni leídos | `property.ts`, `auth.ts` | Decidir: implementar persistencia o eliminar campos | 🟡 - |
| M12 | Colección Subscription documentación incompleta | `appwrite_setup.md` | Agregar campos faltantes: `paddleCustomerId`, `paddleSubscriptionId`, `paddleTransactionId`, `type`, `isManualOverride`, `updatedAt` | 🟢 10 min |
| M13 | APP_URL y NEXT_PUBLIC_BASE_URL duplicados | `.env.example` | Unificar en `NEXT_PUBLIC_BASE_URL`. Eliminar `APP_URL`. | 🟢 5 min |
| M14 | `mercadopago` SDK no instalado | `package.json` | `pnpm add mercadopago` (necesario para Phase 2) | 🟢 5 min |

---

## 🟢 BAJOS (8) — Nice to have

| # | Issue | Archivo | Fix |
|---|-------|---------|-----|
| B1 | `NEXT_PUBLIC_MP_REDIRECT_URI` expone URL de OAuth | `.env.example` | Usar server-only + construir dinámicamente desde el request |
| B2 | `console.error` en validateOrThrow expone estructura | `_validation.ts:6` | Loggear solo en desarrollo |
| B3 | `ratePlanName` 200 chars sin sanitizar | `booking-schemas.ts:15` | Sanitizar server-side antes de almacenar |
| B4 | `guestEmail` patrón `optional().or(literal(""))` frágil | `booking-schemas.ts:21` | Documentar o simplificar |
| B5 | Emoji 📞 en confirmation page | `confirmation/page.tsx:84` | Reemplazar por icono lucide |
| B6 | `AMENITY_ICONS` usa `any` para iconos | `results/page.tsx:14` | Usar `LucideIcon` |
| B7 | `priceId`→`planId` fallback sin migración | `subscription.ts:39`, `admin.ts:60` | Script de migración único |
| B8 | `@paddle/paddle-js` dangling SDK en package.json | `package.json` | Desinstalar si no se usa |

---

## Orden de implementación sugerido

```
LOTE 1 (Críticos + infra — ~2h 15min)
├── A12 ─ Type mismatch precio/valorAjuste (10 min)
├── M12 ─ Completar appwrite_setup.md (10 min)
├── C1 ─ Separar PropertySettingsPublic (15 min)
├── C2 ─ Verificar ownership planTarifarioId (10 min)
├── A11 ─ Validar fechas en searchAvailableRooms (10 min)
├── C3 ─ Unificar schemas + conectar Zod al flujo real (60 min)
└── M10 ─ Rate limiting (20 min)

LOTE 2 (Quick wins performance — ~15 min)
├── A1 ─ DayPicker dinámico
├── A4 ─ Reducir Google Fonts a 2-3
└── A6 + A7 ─ Agregar max/regex a schemas

LOTE 3 (Seguridad — ~45 min)
├── A5 ─ Verificar ownership roomId
├── A9 ─ Alinear reserva-formulario.tsx
└── A8 ─ Unificar env vars Paddle + PADDLE_ENV

LOTE 4 (Arquitectura + Refactor — ~1h 25min)
├── A2 ─ Dividir booking pages en SC/CC
├── A3 ─ Eliminar data fetching duplicado
└── A10 ─ Separar validateOrThrow de schemas

LOTE 5 (Calidad — ~1h)
├── M1-M9 ─ Issues medios
├── M11, M13, M14 ─ Issues medios
└── B1-B8 ─ Issues bajos

LOTE 6 (Verificación — ~15 min)
├── pnpm build (0 errores)
├── Verificar tipos (tsc --noEmit)
└── Smoke test del flujo booking (home → checkout → confirmación)
```

**Total estimado: ~5h 55min**
