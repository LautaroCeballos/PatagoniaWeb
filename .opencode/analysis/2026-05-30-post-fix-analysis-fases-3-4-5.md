# Análisis Post-Fix — Fases 3, 4 y 5

Fecha: 2026-05-30
Contexto: Corrección de 7 issues identificados en auditoría previa.

---

## FASE 3: Mercado Pago — ✅ 100%

| Área | Estado | Cambio aplicado |
|---|---|---|
| **3.3** Token refresh | ✅ | `ensureMpTokenValid` retorna `{ valid, accessToken }`; `public-payment.ts` verifica resultado y usa token directamente |
| **3.5** handleCompletedPayment | ✅ | `syncBookingTotalInternal` tipada con `Databases` (no `any`) |
| **3.6** Webhook MP | ✅ | Validación de `source_news=webhooks` al inicio del handler, rechaza con 400 |
| **3.7** OAuth Callback | ✅ | Validación CSRF: `currentUser.$id === state` antes de procesar |
| **3.9** CheckoutButton | ✅ | `onPayment: Promise<string>` estricto; mensaje de error visible al usuario |
| **3.10** createPublicBooking | ✅ | `searchAvailableRooms()` usa `validateOrThrow(SearchRoomsSchema, ...)` en vez de regex manual |
| **3.12** Confirmation | ✅ | `isPaid = bookingPagoAbonado > 0 \|\| paidParam === "true"` — híbrido DB + URL |

**Archivos modificados (9):**
- `lib/actions/mercadopago-refresh.ts` — retorno `{ valid, accessToken }`
- `lib/actions/public-payment.ts` — verifica resultado de refresh
- `lib/actions/mercadopago-webhook.ts` — tipo `Databases`
- `app/api/webhooks/mercadopago/route.ts` — validación source_news
- `app/api/mercadopago/oauth/route.ts` — validación CSRF
- `components/book/mercadopago-checkout-button.tsx` — tipo estricto + feedback error
- `lib/actions/public.ts` — `SearchRoomsSchema` en searchAvailableRooms + `getPublicBookingById` extendida
- `lib/actions/_validation.ts` — sin cambios (SearchRoomsSchema ya existía)
- `app/[locale]/book/[slug]/confirmation/page.tsx` — lógica híbrida isPaid

---

## FASE 4: Seguridad — ⚠️ 90%

| Componente | Estado | Detalle |
|---|---|---|
| Webhook security (HMAC, timingSafeEqual, timestamp) | ✅ | Sin cambios, ya estaba correcto |
| source_news validation | ✅ | Corregido en esta ronda |
| Price tampering | ✅ | bookingId-only + amount verification |
| Guest data protection | ✅ | Sin PII en URLs |
| Rate limiting | ✅ | Appwrite-based en 3 server actions |
| Zod validation en server actions | ✅ | searchAvailableRooms corregido |
| CSP (MP domains) | ✅ | frame-src, form-action, img-src, connect-src |
| Permission model | ✅ | Admin client + userId-scoped permissions |
| Error boundaries | ✅ | 4x error.tsx |
| **Security headers extra** | **❌ PENDIENTE** | `Permissions-Policy`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy` no implementados en `next.config.ts` |

---

## FASE 5: SEO — ⚠️ 78%

| Componente | Estado | Detalle |
|---|---|---|
| Hreflang util (`seo.ts`) | ⚠️ | Usa `es_ES` (con país) — plan pedía ISO 639-1 puro (`es`). **Falta `x-default`** |
| Root layout hreflang | ⚠️ | Hreflang estático por locale, no dinámico por página |
| Booking layout hreflang | ✅ | `getHreflang(locale, \`/book/${slug}\`)` correcto |
| JSON-LD | ✅ | Hotel schema via BookingJsonLd component |
| **OG Image API** | **❌ PENDIENTE** | `app/api/og/route.tsx` no existe |
| Sitemap | ⚠️ | `lastModified: new Date()` fijo — `getAllPropertySlugs()` no retorna `updatedAt` |
| robots.txt | ✅ | Disallow correcto |
| Metadata por página | ✅ | Robots condicional por ruta transactional |
| Performance SEO | ✅ | DayPicker dynamic import, preconnect, SC indexable |

---

## Resumen

| Fase | Score | Pendiente |
|------|-------|-----------|
| **Fase 3** — Pagos MP | ✅ **100%** | Nada |
| **Fase 4** — Seguridad | ⚠️ **90%** | 3 security headers en `next.config.ts` |
| **Fase 5** — SEO | ⚠️ **78%** | OG image API, `x-default`, `updatedAt` en sitemap |
