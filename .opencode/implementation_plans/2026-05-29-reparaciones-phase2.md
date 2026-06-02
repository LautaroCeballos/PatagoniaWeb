# Plan de Reparaciones — Booking Portal Phase 2 Post-Audit

Fecha: 2026-05-29
Fuente: Auditoría multi-agente (arquitecture + database + explore + frontend + integration + performance + security)
Base: Fase 2 implementada el 2026-05-29

---

## 🔴 LOTE 1 — Bugs que rompen el booking (3 issues)

### 1.1 — `searchAvailableRooms` rechaza todas las búsquedas por formato de fecha

| Campo | Detalle |
|-------|---------|
| **Archivos** | `components/book/search-widget.tsx:65-66`, `app/.../results/page.tsx:45-46` |
| **Causa** | `checkIn.toISOString()` produce `2026-05-29T12:00:00.000Z`, pero `searchAvailableRooms` valida con `/^\d{4}-\d{2}-\d{2}$/` |
| **Fix** | Cambiar los `.toISOString()` por `format(date, "yyyy-MM-dd")` de date-fns en ambos archivos |

### 1.2 — Validación de confirmación contra Appwrite

| Campo | Detalle |
|-------|---------|
| **Archivos** | `app/.../confirmation/page.tsx`, `lib/actions/public.ts` |
| **Causa** | Confirmation lee solo URL params sin verificar que el bookingId existe en DB |
| **Fix** | Agregar server action `getPublicBookingById(bookingId)` en `lib/actions/public.ts`. La página de confirmation llama esta acción y muestra error si no existe |

### 1.3 — Overbooking en privadas por falta de re-verificación

| Campo | Detalle |
|-------|---------|
| **Archivos** | `lib/actions/public.ts:277-300` |
| **Causa** | `createPublicBooking` para privadas no re-verifica disponibilidad antes de crear. Solo compartidas lo hacen |
| **Fix** | Agregar la misma query de overlap check del branch compartidas antes del create en el branch de privadas |

---

## 🔴 LOTE 2 — Performance crítico (2 issues)

### 2.1 — `getPropertyBySlug` sin `React.cache()` → 3-4 llamadas por página

| Campo | Detalle |
|-------|---------|
| **Archivos** | `lib/actions/property.ts:118`, crear `lib/server/data-cache.ts` |
| **Causa** | `getPropertyBySlug` se ejecuta en metadata, layout, page, y hook — sin deduplicación. Además escanea ALL users (O(n)) |
| **Fix inmediato** | Envolver con `React.cache()` → `export const getCachedPropertyBySlug = cache(getPropertyBySlug)` en `lib/server/data-cache.ts` |
| **Fix estructural** | Migrar slug lookup a colección Appwrite con índice único en `slug`, reemplazando `users.list` scan |
| **Archivos afectados** | `layout.tsx`, `page.tsx`, `results/_hooks/useAvailabilitySearch.ts`, `checkout/_hooks/useCheckoutForm.ts` |

### 2.2 — `useSearchParams()` sin Suspense boundary

| Campo | Detalle |
|-------|---------|
| **Archivos** | `app/.../book/[slug]/layout.tsx`, crear `components/book/booking-skeleton.tsx` |
| **Causa** | 3 páginas client usan `useSearchParams()` sin Suspense wrapper. Next.js 15 requiere Suspense |
| **Fix** | Envolver `{children}` en `<Suspense fallback={...}>` dentro del layout.tsx |

---

## 🟡 LOTE 3 — Frontend / UX (5 issues)

### 3.1 — Sticky search bar superpone al header

| Campo | Detalle |
|-------|---------|
| **Archivo** | `components/book/sticky-search-bar.tsx:12` |
| **Fix** | `sticky top-4` → `sticky top-16` (clear 64px header) |

### 3.2 — Guest counter touch targets muy pequeños (28px)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `components/book/guest-counter.tsx:17` |
| **Fix** | `w-7 h-7` → `w-11 h-11` (44px, WCAG 2.5.8). Agregar `aria-live="polite"` al span del valor |

### 3.3 — Breakfast toggle sin keyboard accessibility

| Campo | Detalle |
|-------|---------|
| **Archivo** | `components/book/guest-info-form.tsx:186-201` |
| **Fix** | Reemplazar `<div onClick>` por `<button type="button" role="switch" aria-checked={...}>` con `onKeyDown` |

### 3.4 — Iconos en labels sin `aria-hidden`

| Campo | Detalle |
|-------|---------|
| **Archivo** | `components/book/guest-info-form.tsx` |
| **Fix** | Agregar `aria-hidden="true"` a todos los íconos dentro de `<Label>` |

### 3.5 — `prefers-reduced-motion` no soportado

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/globals.css` |
| **Fix** | Agregar `@media (prefers-reduced-motion: reduce)` que desactive `animate-pulse` |

---

## 🟡 LOTE 4 — i18n faltante (1 issue, ~12 archivos)

### 4.1 — Componentes con strings hardcodeadas en español

| Campo | Detalle |
|-------|---------|
| **Archivos** | `search-widget.tsx`, `guest-counter.tsx`, `guest-info-form.tsx`, `booking-summary.tsx`, `booking-details-card.tsx`, `room-card.tsx`, `sticky-search-bar.tsx`, `results-empty.tsx`, `info-cards.tsx`, `booking-stepper.tsx`, 4× `error.tsx`, `confirmation/page.tsx` |
| **Fix** | Agregar `useTranslations("Booking")` en CC, `getTranslations` en SC. Reemplazar `date-fns/locale/es` por locale dinámico desde `useLocale()` |

---

## 🟡 LOTE 5 — Seguridad / Datos (2 issues)

### 5.1 — `fetchBookingById` sin filtro multi-tenancy

| Campo | Detalle |
|-------|---------|
| **Archivo** | `lib/actions/bookings.ts:284-310` |
| **Fix** | Agregar `Query.equal("userId", userId)` usando userId de sesión autenticada |

### 5.2 — Zod validation en createPublicBooking

| Campo | Detalle |
|-------|---------|
| **Archivo** | `lib/actions/public.ts:163` |
| **Fix** | Agregar `validateOrThrow(CreateBookingSchema, data)` al inicio. Schema ya existe en `_lib/booking-schemas.ts` |

---

## 🟢 LOTE 6 — Limpieza (3 issues)

### 6.1 — Código muerto

| Archivo | Detalle |
|---------|---------|
| `_lib/booking-schemas.ts` | `SearchParamsSchema`, `GuestFormSchema`, `CreateBookingSchema` exportados pero nunca importados |
| `_lib/booking-url-params.ts` | `serializeCheckoutParams`, `parseCheckoutParams`, `serializeConfirmationParams` nunca llamados |
| `confirmation/page.tsx` | `import { useTranslations }` no usado |
| `results/page.tsx` | `ratePlanName` seteado en URL pero nunca leído en checkout |

### 6.2 — Reducir Google Fonts

| Archivo | Detalle |
|---------|---------|
| `app/.../layout.tsx:8-15` | Reducir de 6 familias a 3-4, o cargar condicionalmente según `property.fontHeading` |

### 6.3 — Bug lógico imageUrl en JSON-LD

| Archivo | Detalle |
|---------|---------|
| `components/book/booking-json-ld.tsx` | `property.hotelBannerId ? undefined : undefined` → evaluar fix |

---

## Orden de ejecución sugerido

```
Lote 1 → Lote 2 → Lote 3 → Lote 4 → Lote 5 → Lote 6

1.1   Date format fix           ~10 min    🔴  Sin esto booking no funciona
1.3   Overbooking fix           ~15 min    🔴  Race condition
1.2   Confirmación validación   ~20 min    🔴  Datos inventados en URL
2.1   React.cache + slug refactor ~30 min  🔴  TTFB 3x
2.2   Suspense boundary         ~5 min     🔴  Build warning
3.1-3.5 Frontend fixes          ~30 min    🟡  UX + accesibilidad
4.1   i18n completo             ~40 min    🟡  ~12 archivos
5.1-5.2 Seguridad              ~15 min    🟡  Multi-tenancy + validation
6.1-6.3 Limpieza               ~15 min    🟢  Dead code
```

**Total estimado: ~3 horas.**
**Archivos involucrados: ~20 modificados, ~3 creados.**
