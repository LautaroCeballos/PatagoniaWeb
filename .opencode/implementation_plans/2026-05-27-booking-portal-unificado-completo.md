# Plan Maestro Unificado v3.1 COMPLETO — SART3 Booking Portal

Fecha: 2026-05-27 (v3.1 — Paddle reemplazado por Mercado Pago, marketplace OAuth multi-inquilino, plan completo Fase 0-6)
Autor: opencode (arquitecture + integration + security + seo + performance + database + frontend + Context7 + deep conflict analysis)

---

## Objetivo

Transformar el portal de reservas público (`/book/[slug]`) de un sistema funcional pero genérico a una experiencia de marca premium con pagos online (Mercado Pago), i18n real, SEO robusto, seguridad endurecida, y personalización visual desde el dashboard.

---

## Stack Técnico (verificado con Context7 + package.json)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js App Router, TypeScript strict | `15.1.11` |
| Estilos | Tailwind CSS + shadcn/ui (new-york, base zinc) | `^3.4.1` ✅ (NO v4) |
| Fuentes | Sora + DM Sans + 4 pares — Google Fonts via `next/font/google` | Build-time |
| i18n | next-intl (es/en/pt) | — |
| Calendar | `react-day-picker` con dynamic import + ssr:false | **`^8.10.1`** ⚠️ (NO v9) |
| Iconos | lucide-react | `^0.468.0` |
| Pagos | `mercadopago` (SDK Node.js) — Checkout Pro (redirección) | `^2.3.0` |
| Backend | Appwrite (Database, Auth, Storage) | — |
| Theme | `next-themes` instalado pero NO usado aún | `^0.4.6` |
| Animaciones | `tailwindcss-animate` (ya activo) | `^1.0.7` |

---

## Decisiones de Diseño (v3.1)

| Decisión | Elección | Detalle |
|----------|----------|---------|
| Proveedor de pagos | **Mercado Pago** | Checkout Pro (redirección externa) — NO overlay, NO Paddle |
| Tipo de pago | **Seña porcentual dinámica** (30%) | `unit_price` en Preference de MP, NO priceId fijo |
| Modelo de cuentas | **Marketplace OAuth multi-inquilino** | Cada propietario conecta su cuenta MP vía OAuth |
| Comisión SART | **0%** | Sin `marketplace_fee` — el dinero va directo al owner |
| Moneda | **Automática** | Según la cuenta MP del propietario (país flexible) |
| País operativo | **Flexible LATAM** | Cada owner define su país al conectar su cuenta MP |
| Overlay cerrado sin pago | **Reserva Pendiente** | Flag `paymentCompleted` ref previene race condition |
| CSS Variable scoping | **`:root:has(.booking-theme)`** | NO wrapper div — así portales shadcn heredan variables |
| Nombres CSS variables | **Nombres shadcn** | `--primary`, `--background`, etc. |
| Carga de fuentes | **Booking layout only** | 4 pares precargados en booking layout, switcheables via CSS variable |
| Color utils | **Fase 0** | `hexToHsl()` necesario para provider desde el inicio |
| Webhook diferenciación | **`external_reference` = bookingId vs Paddle** | Webhook MP solo para booking; Paddle conservado solo para suscripciones |
| `syncBookingTotal` | **Refactorizada: export + admin client** | Sin dependencia de session client |
| `updatePropertySettings` | **Unificar en `property.ts`** | Renombrar/eliminar duplicado en `user.ts` |
| Colores booking pages | **Convertir slate → CSS variables** | `text-slate-900` → `text-foreground`, etc. |
| DayPicker API | **v8 `modifiers` + `modifiersStyles`** | NO `--rdp-accent-color` de v9 |

---

## 🔴 Todos los Conflictos Resueltos en v3.1

| # | Severidad | Conflicto | Solución en v3.1 |
|---|-----------|-----------|-------------------|
| 1 | 🔴 | Portales shadcn pierden variables `.booking-theme` wrapper | Usar `:root:has(.booking-theme)` en globals.css |
| 2 | 🔴 | `TransactionCompleted` sin diferenciación subscription vs booking | MP usa `external_reference`; Paddle webhook queda solo para suscripciones |
| 3 | 🔴 | `syncBookingTotal` privada, 5 params, session client | Nueva función self-contained con admin client |
| 4 | 🔴 | `updatePropertySettings` duplicado (property.ts vs user.ts) | Renombrar en user.ts a `updateSubscriptionSettings`, deprecar |
| 5 | 🟠 | Booking pages hardcodeadas con `slate-*` | Conversión sistemática a CSS variables / clases theme-aware |
| 6 | 🟠 | `createPublicBooking` + `checkout/page.tsx` acoplados | Refactor coordinado, Zod validation, userId de DB |
| 7 | 🟡 | `react-day-picker` v8 asumido como v9 | Usar API v8 (`modifiers`, `modifiersClassNames`) |
| 8 | 🟡 | Hreflang afecta 8 páginas + root layout hardcodeado | Cambios coordinados: seo.ts + 6 pages + root layout |
| 9 | 🟡 | CSP sin dominios Mercado Pago | Agregar `*.mercadopago.com` a form-action + img-src + frame-src; eliminar `*.paddle.com` (booking) |
| 10 | 🟡 | `Payment.method` solo actualizado en definitions.ts | Agregar `'MercadoPago'` (saltar `'Paddle'`) |
| 11 | 🟡 | `uploadHotelLogo` vs `uploadPropertyImage` duplicados | Eliminar `uploadHotelLogo` de user.ts |
| 12 | 🟢 | `fontFamily.sans` seguro de agregar | Sin `font-sans` en ningún componente existente |
| 13 | 🟢 | `getAllPropertySlugs` sin timestamps | Extender return type con `updatedAt` |
| 14 | 🟢 | `:root` CSS variables en `@layer base` — baja especificidad | `:root:has(.booking-theme)` fuera de layer |

---

## Directorio de Archivos (Post-Implementación)

```
app/[locale]/book/[slug]/
├── layout.tsx                    ← SEO metadata + fonts + :root:has(.booking-theme) + header/footer
├── page.tsx                      ← Server Component (contenido indexable)
├── page.client.tsx               ← Client Component (SearchWidget wrapper)
├── error.tsx                     ← Error boundary
├── _lib/
│   ├── booking-schemas.ts        ← Zod schemas
│   ├── booking-types.ts          ← Tipos específicos del booking
│   └── booking-url-params.ts     ← Serialización tipada de URL params
├── results/
│   ├── page.tsx                  ← Client Component orquestador
│   ├── error.tsx
│   ├── _components/
│   │   ├── RoomCard.tsx          ← Tarjeta de habitación (theme-aware)
│   │   ├── StickySearchBar.tsx   ← Barra compacta tipo pill
│   │   └── ResultsEmpty.tsx      ← Estado vacío
│   └── _hooks/
│       └── useAvailabilitySearch.ts ← Hook de búsqueda
├── checkout/
│   ├── page.tsx                  ← Client Component orquestador
│   ├── error.tsx
│   ├── _components/
│   │   ├── GuestInfoForm.tsx     ← Formulario datos huésped
│   │   ├── BookingSummary.tsx    ← Sidebar resumen
│   │   └── MercadoPagoCheckoutButton.tsx ← Botón redirección a MP (sin overlay, sin dynamic import)
│   └── _hooks/
│       └── useCheckoutForm.ts    ← Hook formulario + validación Zod
└── confirmation/
    ├── page.tsx                  ← Client Component (paid/pending)
    ├── error.tsx
    └── _components/
        └── BookingDetailsCard.tsx ← Detalles reserva

components/book/                   ← Componentes compartidos (theme-aware)
├── booking-stepper.tsx            ← Stepper 4 pasos
├── booking-theme-provider.tsx     ← Inyecta CSS variables + Google Fonts activas
├── booking-json-ld.tsx            ← JSON-LD (Hotel + BreadcrumbList)
├── search-widget.tsx              ← Selector fechas + huéspedes (DayPicker v8 lazy)
├── date-range-button.tsx          ← Pill fecha clickeable
├── guest-counter.tsx              ← Selector +/- huéspedes
├── room-card.tsx                  ← Tarjeta habitación
├── booking-summary.tsx            ← Sidebar resumen reutilizable
├── mobile-date-strip.tsx          ← Selector fechas simplificado mobile
├── property-header.tsx            ← Header + dark mode toggle
├── info-cards.tsx                 ← 3 cards propuesta de valor
├── theme-preset-selector.tsx      ← 6 círculos de color presets
├── color-picker-field.tsx         ← Input color + hex label
├── font-selector.tsx              ← Dropdown pares tipográficos
├── image-upload-field.tsx         ← Drag & drop + preview
├── mercadopago-checkout-button.tsx← Botón redirección MP
└── theme-preview.tsx              ← Preview en vivo del portal

lib/
├── actions/
│   ├── public.ts                  ← searchAvailableRooms() + createPublicBooking() (con Zod + rate limit)
│   ├── public-payment.ts          ← createMercadoPagoPreference() (token seller via OAuth + rate limit)
│   ├── mercadopago-webhook.ts     ← handleCompletedPayment() (admin client, idempotente)
│   ├── mercadopago-oauth.ts       ← OAuth: getAuthUrl(), handleCallback(), disconnect()
│   ├── payments.ts                ← CRUD pagos (dashboard owners) + syncBookingTotal exportada
│   ├── bookings.ts                ← CRUD reservas (dashboard owners)
│   ├── subscription.ts            ← Suscripciones Paddle (sin cambios)
│   ├── property.ts                ← updatePropertySettings() + getPropertyBySlug() CANÓNICA
│   ├── user.ts                    ← (updatePropertySettings RENOMBRADA a updateSubscriptionSettings)
│   └── _validation.ts             ← Zod validation wrapper + schemas completos
├── color-utils.ts                 ← hexToRgba(), darken(), lighten(), getContrastColor(), hexToHsl()
├── rate-limiter.ts                ← In-memory rate limiter (10 req/min/IP)
├── json-ld.ts                     ← hotelSchema(), breadcrumbList(), webPageSchema()
├── mercadopago.ts                 ← Cliente Mercado Pago Node SDK (singleton — token de plataforma)
├── definitions.ts                 ← Payment.method (+ 'MercadoPago'), PropertySettings con mp tokens + theme fields
├── seo.ts                         ← getHreflang() ISO 639-1 (es/en/pt + x-default), getOGLocale() intacta
├── constants/
│   ├── plans.ts                   ← IDs precios Paddle suscripción (sin cambios)
│   └── booking.ts                 ← Deposit percent, etc.
└── server/
    └── appwrite.ts                ← createAdminClient(), createSessionClient()

app/api/webhooks/
├── paddle/route.ts                ← CONSERVAR solo suscripciones (eliminar TransactionCompleted booking)
└── mercadopago/route.ts           ← NUEVO: Webhook pagos reserva (validación firma HMAC-SHA256)

app/api/mercadopago/oauth/route.ts ← NUEVO: Callback OAuth (recibe code → intercambia por tokens)

app/api/og/route.tsx               ← NUEVO: OG Image dinámica (hotel name + color)

app/robots.ts                      ← NUEVO: robots.txt

app/[locale]/dashboard/settings/page.tsx ← + sección "Personalización Visual" + sección "Conectar Mercado Pago"

messages/{es,en,pt}.json           ← + namespace "Booking" + "Settings.theme" + "Settings.mercadopago"

next.config.ts                     ← CSP actualizado (MP domains: mercadopago.com, mercadolibre.com) + security headers

globals.css                        ← + `:root:has(.booking-theme)` (sin modificar :root existente)
```

---

## Fase 0: Setup de Diseño

### 0.1 Cargar fuentes en BOOKING LAYOUT (no root layout)

**Archivos**: `app/[locale]/book/[slug]/layout.tsx` **[MODIFICAR]**, `tailwind.config.ts` **[MODIFICAR]**

Cargar los 4 pares de fuentes completos para soportar switching dinámico por propiedad:

```tsx
// app/[locale]/book/[slug]/layout.tsx
import { Sora, DM_Sans, Playfair_Display, Lato, Plus_Jakarta_Sans, Inter } from 'next/font/google'

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const lato = Lato({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-lato', display: 'swap' })
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta', display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
```

En `tailwind.config.ts`:
```ts
fontFamily: {
  sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],  // Geist como default
  display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
  heading: ['var(--font-sora)', 'system-ui', 'sans-serif'],
  body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
}
```

⚠️ **`fontFamily.sans` es SEGURO** — ningún componente existente usa la clase `font-sans`. Se mantiene Geist como fallback para el dashboard. Los componentes del booking usarán `font-heading` y `font-body`.

Agregar preconnect para Google Fonts:
```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
```

### 0.2 Definir colores base con `:root:has(.booking-theme)` — SOLUCIÓN PORTALES

**Archivo**: `app/globals.css` **[MODIFICAR]** — agregar bloque NUEVO (no modificar `:root` existente)

```css
/* ⚠️ NO MODIFICAR el :root existente (zinc para dashboard) */

/* Agregar AL FINAL de globals.css, fuera de @layer base */
:root:has(.booking-theme) {
  --background: 40 30% 97%;        /* #F7F4EF */
  --foreground: 30 15% 15%;        /* #2C2926 */
  --primary: 8 60% 50%;            /* #C96A4F */
  --primary-foreground: 40 30% 97%;
  --secondary: 170 40% 35%;        /* #367A6E */
  --secondary-foreground: 0 0% 100%;
  --accent: 30 60% 55%;            /* #C98F4F */
  --accent-foreground: 30 15% 15%;
  --muted: 40 20% 92%;             /* #EBE6DC */
  --muted-foreground: 30 10% 45%;  /* #7B746C */
  --border: 30 15% 85%;            /* #DDD5CC */
  --input: 30 15% 85%;
  --ring: 8 60% 50%;
  --radius: 0.5rem;                /* mantener 0.5rem */
}
```

**¿Por qué `:root:has(.booking-theme)`?**
- Los CSS pseudo-class `:has()` permiten aplicar estilos al `:root` cuando existe un descendiente con `.booking-theme`
- `document.body` (donde se renderizan portales shadcn) sigue siendo descendiente de `:root`
- Así, `SelectContent`, `PopoverContent`, `DialogContent` heredan las variables del booking
- **No afecta al dashboard** porque el dashboard no tiene `.booking-theme`

Aplicar la clase en `book/[slug]/layout.tsx`:
```tsx
<body className={`${geistSans.variable} ${sora.variable} ... booking-theme`}>
```

### 0.3 Crear BookingStepper

`components/book/booking-stepper.tsx` — Stepper de 4 pasos. `<ol>` semántico con `aria-current="step"`.

Pasos: Fechas (Calendar) → Habitación (BedDouble) → Pago (CreditCard) → Confirmación (CheckCircle2).

Completado: `bg-secondary text-secondary-foreground` (teal). Activo: `bg-primary text-primary-foreground ring-2 ring-primary/30` (terracota glow). Futuro: `border-2 border-muted-foreground/30 text-muted-foreground`.

### 0.4 Crear BookingThemeProvider (con nombres shadcn + `:root:has`)

**Archivo**: `components/book/booking-theme-provider.tsx` **[CREAR]**

⚠️ **YA NO inyecta variables via wrapper div** — las variables están en `globals.css` con `:root:has(.booking-theme)`. El provider solo aplica la clase `booking-theme` al `<body>` y gestiona fuentes.

```tsx
type ThemeSettings = {
  primary: string
  secondary: string
  background: string
  fontHeading: string  // 'Sora' | 'Playfair Display' | 'Plus Jakarta Sans'
  fontBody: string     // 'DM Sans' | 'Lato' | 'Inter'
}

const FONT_MAP = {
  'Sora': 'var(--font-sora)',
  'DM Sans': 'var(--font-dm-sans)',
  'Playfair Display': 'var(--font-playfair)',
  'Lato': 'var(--font-lato)',
  'Plus Jakarta Sans': 'var(--font-plus-jakarta)',
  'Inter': 'var(--font-inter)',
} as const
```

El provider usa un `<style>` tag con alta especificidad para override de colores específicos de la propiedad:
```css
:root:has(.booking-theme[data-primary="#C96A4F"]) {
  --primary: 8 60% 50%;
}
```

**Variables para dark mode** (cuando `data-theme="dark"` en html):
- Booking theme provider setea `--booking-primary-dark`, `--booking-bg-dark`, etc.

### 0.5 Crear color-utils.ts

**Archivo**: `lib/color-utils.ts` **[CREAR]**

```typescript
export function hexToRgba(hex: string, alpha: number): string
export function darken(hex: string, percent: number): string
export function lighten(hex: string, percent: number): string
export function getContrastColor(hex: string): '#FFFFFF' | '#000000'
export function isValidHex(hex: string): boolean
export function hexToHsl(hex: string): string  // "#C96A4F" → "8 60% 50%"
```

### 0.6 Convertir colores hardcodeados en booking pages

**Archivos**: `app/[locale]/book/[slug]/page.tsx`, `results/page.tsx`, `checkout/page.tsx`, `confirmation/page.tsx`, `layout.tsx` **[MODIFICAR]**

| Hardcodeado (actual) | Theme-aware (nuevo) |
|---------------------|---------------------|
| `bg-white` | `bg-background` |
| `text-slate-900` | `text-foreground` |
| `text-slate-600` | `text-muted-foreground` |
| `border-slate-200` | `border-border` |
| `bg-slate-50` | `bg-muted/50` |
| `bg-emerald-500` | `bg-secondary` |
| `text-emerald-600` | `text-secondary-foreground` |
| `shadow-lg` (default) | `shadow-warm` (si se define en tailwind.config) |

---

## Fase 1: Fundación — Schemas + i18n + Tipos + Env + Zod

### 1.1 Zod Schemas (react-day-picker v8 compatible)

**Archivo**: `app/[locale]/book/[slug]/_lib/booking-schemas.ts` **[CREAR]**

```typescript
export const SearchParamsSchema = z.object({
  checkIn: z.string().min(1).max(10),
  checkOut: z.string().min(1).max(10),
  guests: z.coerce.number().int().min(1).max(100),
})

export const CheckoutParamsSchema = SearchParamsSchema.extend({
  roomId: z.string().min(1).max(36),
  roomName: z.string().min(1).max(200),
  finalPrice: z.coerce.number().positive().max(999999),
  basePrice: z.coerce.number().positive().max(999999),
  nights: z.coerce.number().int().positive().max(365),
  ratePlanName: z.string().max(200).optional(),
  ratePlanId: z.string().max(36).optional(),
})

export const GuestFormSchema = z.object({
  guestName: z.string().min(2).max(100).trim(),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().max(20).optional(),
  guestDni: z.string().max(20).optional(),
  arrivalTime: z.string().max(5).optional(),
  breakfast: z.boolean().default(false),
  notes: z.string().max(500).optional(),
})

export const ConfirmationParamsSchema = z.object({
  bookingId: z.string().min(1).max(36),
  roomName: z.string().max(200),
  checkIn: z.string().max(10),
  checkOut: z.string().max(10),
  guestName: z.string().max(100),
  finalPrice: z.coerce.number().positive(),
  paid: z.coerce.boolean().optional().default(false),
})

export const CreateBookingSchema = CheckoutParamsSchema.merge(GuestFormSchema)
```

📌 TODOS los schemas tienen `max()` + `trim()` para prevenir ataques.

### 1.2 Booking URL Params

**Archivo**: `app/[locale]/book/[slug]/_lib/booking-url-params.ts` **[CREAR]**

`serializeCheckoutParams()`, `parseCheckoutParams()`, `serializeConfirmationParams()` con Zod `safeParse`.

### 1.3 Extender Payment.method (3 archivos)

**Archivo 1**: `lib/definitions.ts` **[MODIFICAR]** — línea 227
```typescript
method: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro' | 'MercadoPago';
```

**Archivo 2**: `components/app/add-payment-dialog.tsx` **[MODIFICAR]** — línea 54
```typescript
method: z.enum(["Efectivo", "Transferencia", "Tarjeta", "Otro", "MercadoPago"]),
```

**Archivo 3**: `components/app/add-payment-dialog.tsx` **[MODIFICAR]** — líneas 240-244
```tsx
<SelectItem value="MercadoPago">Mercado Pago</SelectItem>
```

### 1.4 Unificar PropertySettings + resolver naming collision + MP tokens + theme fields

**Archivo**: `lib/definitions.ts` **[MODIFICAR]**
```typescript
export interface PropertySettings {
  hotelName?: string
  propertySlug?: string
  currencySymbol?: string
  themePreset?: string
  themePrimary?: string
  themeSecondary?: string
  themeBackground?: string
  themeFontHeading?: string
  themeFontBody?: string
  hotelLogoId?: string
  hotelBannerId?: string
  // Mercado Pago
  mp_access_token?: string
  mp_refresh_token?: string
  mp_user_id?: string
  mp_connected_at?: string
}
```

**Archivo**: `lib/actions/user.ts` **[MODIFICAR]** — RENOMBRAR `updatePropertySettings` a `updateSubscriptionSettings` para eliminar la colisión con `property.ts`:

```typescript
// ⚠️ RENOMBRADO: updatePropertySettings → updateSubscriptionSettings
// Para evitar colisión con lib/actions/property.ts que es la canónica
export async function updateSubscriptionSettings(
  userId: string,
  data: { hotelName?: string, propertySlug?: string, currencySymbol?: string, hotelLogoId?: string }
) {
  // ...escribe en SUBSCRIPTION collection
}
```

También eliminar `uploadHotelLogo` de `user.ts` — la función canónica es `uploadPropertyImage` en `property.ts`.

**Archivo**: `lib/actions/property.ts` **[MODIFICAR]** — Importar `PropertySettings` desde `definitions.ts`:
```typescript
import type { PropertySettings } from "@/lib/definitions"
// Eliminar la interface local duplicada
```

### 1.5 Env vars

**Archivos**: `.env.local`, `.env.example` **[MODIFICAR]**
```bash
# === MERCADO PAGO — Portal de Reservas ===
MP_CLIENT_ID=
MP_CLIENT_SECRET=
MP_PLATFORM_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
NEXT_PUBLIC_MP_PUBLIC_KEY=
NEXT_PUBLIC_MP_REDIRECT_URI=
NEXT_PUBLIC_MP_ENV=sandbox

# === PADDLE — Suscripciones SART (conservar) ===
PADDLE_SUBSCRIPTION_API_KEY=
PADDLE_SUBSCRIPTION_WEBHOOK_SECRET=
NEXT_PUBLIC_PADDLE_SUBSCRIPTION_CLIENT_TOKEN=

# === COMPARTIDO ===
NEXT_PUBLIC_BOOKING_DEPOSIT_PERCENT=30
APP_URL=https://sart.app
```

❌ Eliminadas: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENV`.

### 1.6 Keys i18n

**Archivos**: `messages/{es,en,pt}.json` **[MODIFICAR]**

Namespace `Booking`: home.*, results.*, checkout.*, confirmation.*, layout.* (ver v2.0).
Namespace `Settings.theme`: title, presets, color pickers, fonts, preview, reset.
Namespace `Settings.mercadopago`: connect, disconnect, connected, error, retry.

### 1.7 Zod validation wrapper + schemas servidor

**Archivo**: `lib/actions/_validation.ts` **[CREAR]**
```typescript
import { z } from "zod"

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('[Validation]', result.error.flatten())
    throw new Error('Invalid input')
  }
  return result.data
}

// Schemas para server actions públicas
export const SearchRoomsSchema = z.object({
  userId: z.string().min(1).max(36),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(100),
})

export const CreatePreferenceSchema = z.object({
  bookingId: z.string().min(1).max(36),
  guestEmail: z.string().email().optional().or(z.literal("")),
})
```

---

## Fase 2: Extracción de Componentes + i18n + Rediseño Visual

### 2.1 Booking Home — refactor Server/Client split

**Antes**: `page.tsx` — 100% client component, dead imports de `getPropertyBySlug` y `searchAvailableRooms`, sin contenido indexable.

**Después**:
- `page.tsx` → **Server Component**. Renderiza `<h1>` con hotelName, descripción indexable, JSON-LD, FAQ section, `<SearchWidget>`. Recibe `property` del layout como prop.
- `page.client.tsx` → **Client Component** con DayPicker v8 lazy-loaded + guest counter + infoCards con stagger animation CSS-only.

### 2.2 SearchWidget (DayPicker v8)

**Archivo**: `components/book/search-widget.tsx` **[CREAR]**

⚠️ **`react-day-picker` v8** usa `modifiers` + `modifiersStyles` / `modifiersClassNames`, NO `--rdp-accent-color` (que es de v9):

```tsx
const DayPicker = dynamic(() => import("react-day-picker").then(m => m.DayPicker), { ssr: false })

// DayPicker v8 theme custom:
const modifiers = { today: new Date() }
const modifiersStyles = {
  selected: { backgroundColor: 'hsl(var(--primary))', borderRadius: '10px', color: 'white' },
  today: { border: '2px solid hsl(var(--primary))' },
  range_middle: { backgroundColor: 'hsl(var(--primary) / 0.1)' },
}
```

- Guest counter con tap targets 44px
- Botón "Ver disponibilidad" sticky bottom mobile con `safe-area-inset-bottom`
- Calendar reveal con CSS `grid-template-rows: 0fr → 1fr`

### 2.3 Results

**Archivo**: `results/page.tsx` **[REFACTOR]** — i18n, RoomCard, StickySearchBar, ResultsEmpty, useAvailabilitySearch.

**RoomCard**: colores theme-aware (`border-primary`/`border-secondary`), warm shadow, price pill.

**StickySearchBar**: `bg-background/80 backdrop-blur-lg`, pills compactos. En mobile: `backdrop-blur` puede reemplazarse por `bg-background` sólido por performance.

**useAvailabilitySearch**: recibe `userId` como prop (no resuelve slug internamente).

### 2.4 Checkout

**Archivo**: `checkout/page.tsx` **[REFACTOR]**

- Layout 1.3fr / 1fr con `bg-background`
- GuestInfoForm con Zod, stacked layout, Switch para breakfast
- BookingSummary con info de seña, price breakdown
- MercadoPagoCheckoutButton (redirección simple, sin overlay, sin dynamic import)

### 2.5 Confirmation

**Archivo**: `confirmation/page.tsx` **[REFACTOR]**

- BookingDetailsCard con `paid=true/false`, badge teal/amber, animations CSS
- Botón reintentar pago si `paid=false`

### 2.6 Layout

**Archivo**: `app/[locale]/book/[slug]/layout.tsx` **[MODIFICAR]**

- Clase `booking-theme` en `<body>` para activar `:root:has(.booking-theme)`
- `getTranslations("Booking")` para header/footer i18n
- Locale REAL de `params` para hreflang/OG/canonical
- BookingThemeProvider + BookingJsonLd
- OG image desde `hotelBannerId`
- `noindex, follow` en results / `noindex, nofollow` en checkout+confirmation
- Pasa `property` como prop a children

---

## Fase 3: Integración de Pagos — Mercado Pago (Checkout Pro)

### 3.1 Mercado Pago SDK Singleton

**Archivo**: `lib/mercadopago.ts` **[CREAR]**

```typescript
import { MercadoPagoConfig } from 'mercadopago'

// Token de PLATAFORMA para consultar pagos en webhook (sin marketplace_fee)
export const mercadopagoPlatform = new MercadoPagoConfig({
  accessToken: process.env.MP_PLATFORM_ACCESS_TOKEN!,
  options: { timeout: 10000 },
})
```

### 3.2 OAuth Flow — Conectar Cuenta MP

**Archivo**: `lib/actions/mercadopago-oauth.ts` **[CREAR]**

```typescript
"use server"

import { OAuth, MercadoPagoConfig } from 'mercadopago'
import { createAdminClient } from "@/lib/server/appwrite"

export async function getMpAuthUrl(userId: string): Promise<string> {
  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_PLATFORM_ACCESS_TOKEN!,
  })
  const oauth = new OAuth(client)

  return oauth.getAuthorizationURL({
    options: {
      client_id: process.env.MP_CLIENT_ID!,
      redirect_uri: process.env.NEXT_PUBLIC_MP_REDIRECT_URI!,
      state: userId, // CSRF: userId como state
    },
  })
}

export async function handleMpCallback(code: string, userId: string) {
  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_PLATFORM_ACCESS_TOKEN!,
  })
  const oauth = new OAuth(client)
  const tokens = await oauth.create({
    body: {
      client_id: process.env.MP_CLIENT_ID!,
      client_secret: process.env.MP_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.NEXT_PUBLIC_MP_REDIRECT_URI!,
    },
  })

  // Guardar tokens en PropertySettings del owner
  const { databases } = await createAdminClient()
  const COLL_PROPERTY = process.env.NEXT_APPWRITE_COLLECTION_PROPERTY_ID!
  const DATABASE_ID = process.env.NEXT_APPWRITE_DATABASE_ID!

  const properties = await databases.listDocuments(DATABASE_ID, COLL_PROPERTY, [
    Query.equal('userId', userId)
  ])
  if (properties.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, COLL_PROPERTY, properties.documents[0].$id, {
      mp_access_token: tokens.access_token,
      mp_refresh_token: tokens.refresh_token,
      mp_user_id: String(tokens.user_id),
      mp_connected_at: new Date().toISOString(),
    })
  }
}

export async function disconnectMp(userId: string) {
  const { databases } = await createAdminClient()
  const COLL_PROPERTY = process.env.NEXT_APPWRITE_COLLECTION_PROPERTY_ID!
  const DATABASE_ID = process.env.NEXT_APPWRITE_DATABASE_ID!

  const properties = await databases.listDocuments(DATABASE_ID, COLL_PROPERTY, [
    Query.equal('userId', userId)
  ])
  if (properties.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, COLL_PROPERTY, properties.documents[0].$id, {
      mp_access_token: null,
      mp_refresh_token: null,
      mp_user_id: null,
      mp_connected_at: null,
    })
  }
}
```

### 3.3 createMercadoPagoPreference (dinámico + Zod + token del seller + rate limit)

**Archivo**: `lib/actions/public-payment.ts` **[REESCRIBIR]**

```typescript
"use server"

import { MercadoPagoConfig, Preference } from "mercadopago"
import { createAdminClient } from "@/lib/server/appwrite"
import { headers } from "next/headers"
import { validateOrThrow, CreatePreferenceSchema } from "./_validation"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function createMercadoPagoPreference(
  bookingId: string,
  guestEmail?: string
) {
  // Rate limit
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for") ?? "unknown"
  const { allowed } = checkRateLimit(ip)
  if (!allowed) throw new Error("Demasiadas solicitudes. Intenta de nuevo en 1 minuto.")

  // Zod validation
  const { bookingId: bId } = validateOrThrow(CreatePreferenceSchema, { bookingId, guestEmail })

  const { databases } = await createAdminClient()
  const DATABASE_ID = process.env.NEXT_APPWRITE_DATABASE_ID!
  const COLL_RESERVA = process.env.NEXT_APPWRITE_COLLECTION_RESERVA_ID!
  const COLL_PROPERTY = process.env.NEXT_APPWRITE_COLLECTION_PROPERTY_ID!
  const { Query } = await import("node-appwrite")

  // 1. Leer booking
  const bookingDoc = await databases.getDocument(DATABASE_ID, COLL_RESERVA, bId)

  // 2. Leer propiedad para obtener mp_access_token del owner
  const properties = await databases.listDocuments(DATABASE_ID, COLL_PROPERTY, [
    Query.equal('userId', bookingDoc.userId)
  ])
  if (properties.documents.length === 0 || !properties.documents[0].mp_access_token) {
    throw new Error('El propietario no ha conectado su cuenta de Mercado Pago')
  }

  const property = properties.documents[0]
  const depositPercent = Number(process.env.NEXT_PUBLIC_BOOKING_DEPOSIT_PERCENT || 30)
  const depositAmount = Math.round(bookingDoc.totalValor * (depositPercent / 100))
  const appUrl = process.env.APP_URL!
  const slug = property.propertySlug || ''

  // 3. Crear Preference usando token del SELLER (no de la plataforma)
  const sellerClient = new MercadoPagoConfig({
    accessToken: property.mp_access_token,
  })
  const preference = await new Preference(sellerClient).create({
    body: {
      items: [{
        id: `booking-${bId}`,
        title: `Seña ${depositPercent}% - Reserva Hotel`,
        quantity: 1,
        unit_price: depositAmount,
      }],
      payer: { email: guestEmail || '' },
      back_urls: {
        success: `${appUrl}/book/${slug}/confirmation?bookingId=${bId}&paid=true`,
        failure: `${appUrl}/book/${slug}/confirmation?bookingId=${bId}&paid=false`,
        pending: `${appUrl}/book/${slug}/confirmation?bookingId=${bId}&paid=false`,
      },
      auto_return: 'approved',
      external_reference: bId,
      notification_url: `${appUrl}/api/webhooks/mercadopago?source_news=webhooks`,
      // Sin marketplace_fee — SART no cobra comisión
    }
  })

  return {
    initPoint: preference.init_point!,
    preferenceId: preference.id!,
    depositAmount,
    totalAmount: bookingDoc.totalValor,
  }
}
```

### 3.4 handleCompletedPayment (admin client + self-contained + idempotente)

**Archivo**: `lib/actions/mercadopago-webhook.ts` **[CREAR]**

```typescript
"use server"

import { createAdminClient } from "@/lib/server/appwrite"

export async function handleCompletedPayment(data: {
  bookingId: string
  amount: number
  currencyCode: string
  mpPaymentId: string
  mpPreferenceId?: string
}) {
  const { databases } = await createAdminClient()
  const { ID, Query, Permission, Role } = await import("node-appwrite")
  const DATABASE_ID = process.env.NEXT_APPWRITE_DATABASE_ID!
  const COLL_PAGO = process.env.NEXT_APPWRITE_COLLECTION_PAGO_ID!
  const COLL_RESERVA = process.env.NEXT_APPWRITE_COLLECTION_RESERVA_ID!

  // 1. Idempotencia
  const existing = await databases.listDocuments(DATABASE_ID, COLL_PAGO, [
    Query.equal('receipt', data.mpPaymentId)
  ])
  if (existing.total > 0) return { success: true, duplicate: true }

  // 2. Validar booking existe
  const bookingDoc = await databases.getDocument(DATABASE_ID, COLL_RESERVA, data.bookingId)

  // 3. Validar monto (opcional — solo warning)
  const depositPercent = Number(process.env.NEXT_PUBLIC_BOOKING_DEPOSIT_PERCENT || 30)
  const expectedDeposit = Math.round(bookingDoc.totalValor * (depositPercent / 100))
  if (Math.abs(data.amount - expectedDeposit) > 1) {
    console.warn(`[MP] Amount mismatch: expected ${expectedDeposit}, got ${data.amount}`)
  }

  // 4. Crear PAGO
  await databases.createDocument(DATABASE_ID, COLL_PAGO, ID.unique(), {
    bookingId: data.bookingId,
    amount: data.amount,
    method: 'MercadoPago',
    date: new Date().toISOString(),
    receipt: data.mpPaymentId,
    notes: `Pago online Mercado Pago - ${data.currencyCode}`,
    userId: bookingDoc.userId,
  }, [
    Permission.read(Role.user(bookingDoc.userId)),
    Permission.update(Role.user(bookingDoc.userId)),
    Permission.delete(Role.user(bookingDoc.userId)),
  ])

  // 5. Sync pagoAbonado
  await syncBookingTotalInternal(data.bookingId, databases, DATABASE_ID, COLL_PAGO, COLL_RESERVA)

  // 6. Actualizar estado
  await databases.updateDocument(DATABASE_ID, COLL_RESERVA, data.bookingId, {
    estado: 'Confirmada',
    paymentMethod: 'MercadoPago',
  })

  // 7. Si groupId, actualizar hermanas
  if (bookingDoc.groupId) {
    const group = await databases.listDocuments(DATABASE_ID, COLL_RESERVA, [
      Query.equal('groupId', bookingDoc.groupId)
    ])
    for (const doc of group.documents) {
      await syncBookingTotalInternal(doc.$id, databases, DATABASE_ID, COLL_PAGO, COLL_RESERVA)
      await databases.updateDocument(DATABASE_ID, COLL_RESERVA, doc.$id, {
        estado: 'Confirmada',
        paymentMethod: 'MercadoPago',
      })
    }
  }

  return { success: true }
}

async function syncBookingTotalInternal(
  bookingId: string, databases: any,
  databaseId: string, collPayments: string, collBooking: string
) {
  const { Query } = await import("node-appwrite")
  const paymentsList = await databases.listDocuments(databaseId, collPayments, [
    Query.equal('bookingId', bookingId)
  ])
  const totalPaid = paymentsList.documents.reduce(
    (sum: number, doc: any) => sum + (doc.amount || 0), 0
  )
  await databases.updateDocument(databaseId, collBooking, bookingId, { pagoAbonado: totalPaid })
}
```

### 3.5 Webhook Mercado Pago (con validación de firma HMAC-SHA256)

**Archivo**: `app/api/webhooks/mercadopago/route.ts` **[CREAR]**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { mercadopagoPlatform } from '@/lib/mercadopago'
import { handleCompletedPayment } from '@/lib/actions/mercadopago-webhook'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    // 1. Validar firma x-signature
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')
    const body = await req.json()
    const dataId = body.data?.id?.toString()

    if (!verifyMpSignature(xSignature, xRequestId, dataId, process.env.MP_WEBHOOK_SECRET!)) {
      console.error('[MP Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Obtener detalles del pago (usando token de plataforma)
    const payment = await new Payment(mercadopagoPlatform).get({ id: dataId })

    // Solo procesar pagos aprobados
    if (payment.status !== 'approved') {
      return NextResponse.json({ received: true })
    }

    // 3. Leer bookingId desde external_reference
    const bookingId = payment.external_reference
    if (!bookingId) {
      console.error('[MP Webhook] No external_reference found')
      return NextResponse.json({ received: true })
    }

    // 4. Procesar
    await handleCompletedPayment({
      bookingId: String(bookingId),
      amount: payment.transaction_amount!,
      currencyCode: payment.currency_id || 'ARS',
      mpPaymentId: String(payment.id!),
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[MP Webhook] Error:', error)
    // Siempre responder 200 para evitar reintentos infinitos
    return NextResponse.json({ received: true, error: String(error) })
  }
}

function verifyMpSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secret: string
): boolean {
  if (!xSignature || !xRequestId || !dataId || !secret) return false
  const parts = xSignature.split(',')
  let ts = '', hash = ''
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key?.trim() === 'ts') ts = value?.trim() || ''
    if (key?.trim() === 'v1') hash = value?.trim() || ''
  }
  if (!ts || !hash) return false
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  } catch {
    return false
  }
}
```

### 3.6 OAuth Callback endpoint

**Archivo**: `app/api/mercadopago/oauth/route.ts` **[CREAR]**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { handleMpCallback } from '@/lib/actions/mercadopago-oauth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?mp=error', req.url))
  }

  try {
    await handleMpCallback(code, state)
    return NextResponse.redirect(new URL('/dashboard/settings?mp=connected', req.url))
  } catch (error) {
    console.error('[MP OAuth] Error:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?mp=error', req.url))
  }
}
```

### 3.7 MercadoPagoCheckoutButton (redirección simple, sin overlay)

**Archivo**: `components/book/mercadopago-checkout-button.tsx` **[CREAR]**

```tsx
"use client"

import { createMercadoPagoPreference } from "@/lib/actions/public-payment"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface Props {
  bookingId: string
  guestEmail?: string
  disabled?: boolean
  label?: string
  loadingLabel?: string
}

export function MercadoPagoCheckoutButton({
  bookingId,
  guestEmail,
  disabled,
  label = "Pagar seña del 30%",
  loadingLabel = "Redirigiendo a Mercado Pago...",
}: Props) {
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    setLoading(true)
    try {
      const { initPoint } = await createMercadoPagoPreference(bookingId, guestEmail)
      window.location.href = initPoint
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <Button onClick={handlePayment} disabled={disabled || loading} className="w-full">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {loading ? loadingLabel : label}
    </Button>
  )
}
```

### 3.8 Modificar createPublicBooking (con Zod + rate limit + userId de DB)

**Archivo**: `lib/actions/public.ts` **[MODIFICAR]**

- **Rate limit** via `checkRateLimit(ip)` al inicio
- **Leer `userId` de roomDoc** (`databases.getDocument(habitacionId)`) — no del input del cliente
- **Agregar validación Zod** en inputs vía `validateOrThrow(CreateBookingSchema, data)`
- Retornar `bookingIds[]` además de `bookingId`

### 3.9 Modificar Webhook Paddle (solo suscripciones)

**Archivo**: `app/api/webhooks/paddle/route.ts` **[MODIFICAR]**

- **Eliminar** el case `TransactionCompleted` para booking
- **Conservar** eventos de suscripción: `SubscriptionCreated`, `SubscriptionUpdated`, `SubscriptionCanceled`
- Si llega `TransactionCompleted` sin `customData.bookingId` → loguear e ignorar

### 3.10 Flujo checkout con pago (Mercado Pago Checkout Pro)

```
1. Guest completa GuestInfoForm → Zod validation → createPublicBooking()
   (rate limit check + userId se lee de roomDoc.userId, NO del input del cliente)
2. Reserva creada como "Pendiente" → se muestra BookingSummary
3. Guest ve dos opciones:
   [Pagar seña del 30% ($xxx)] → createMercadoPagoPreference() → redirect a MP
   [Reservar sin pagar ahora] → redirect confirmation?paid=false
4. Guest paga en Mercado Pago (tarjeta/PIX/etc)
5. MP redirige automáticamente a:
   - success: confirmation?bookingId=X&paid=true
   - failure/pending: confirmation?bookingId=X&paid=false
6. Webhook POST /api/webhooks/mercadopago:
   a. Validar firma x-signature (HMAC-SHA256)
   b. payment.status === 'approved'?
   c. Leer bookingId de external_reference
   d. Validar monto vs depósito esperado
   e. Idempotencia: check Unique Index en PAGO.receipt
   f. Crear PAGO document + syncBookingTotal
   g. Actualizar estado → 'Confirmada'
7. confirmation?paid=false → botón "Reintentar" que llama createMercadoPagoPreference() de nuevo
8. confirmation?paid=true → badge verde "Pago confirmado", detalles de reserva
```

---

## Fase 4: Seguridad y Hardening (detalle completo)

### 4.1 Webhook Security (Mercado Pago)
- ✅ Validar `x-signature` header con HMAC-SHA256 + `crypto.timingSafeEqual()`
- ✅ Validar `MP_WEBHOOK_SECRET` antes de cualquier procesamiento
- ✅ Idempotencia DB-backed + Unique Index en PAGO.receipt
- ✅ Validar `payment.status === 'approved'`
- ✅ Validar monto transaction_amount vs depósito esperado
- ✅ Forzar `source_news=webhooks` en notification_url para evitar IPN no verificables

### 4.2 Price Tampering
- ✅ `createMercadoPagoPreference()` solo recibe bookingId — monto de DB
- ✅ Webhook verifica transaction_amount vs depósito esperado
- ✅ `unit_price` dinámico (no priceId fijo)
- ✅ Sin `marketplace_fee` — 0% comisión, dinero directo al seller

### 4.3 Guest Data Protection
- ✅ `external_reference`: solo bookingId — sin PII
- ✅ `payer.email` se envía solo para experiencia de pago, no se persiste
- ✅ No se envían datos sensibles en URL de redirección

### 4.4 Rate Limiting — Implementación concreta

**Archivo nuevo**: `lib/rate-limiter.ts`

```typescript
const rateMap = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1 }
  }
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }
  entry.count++
  return { allowed: true, remaining: MAX_REQUESTS - entry.count }
}

// Limpieza cada 5 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key)
  }
}, 300_000)
```

**Server actions protegidas**:
| Server Action | Ubicación |
|---|---|
| `searchAvailableRooms` | `lib/actions/public.ts` |
| `createPublicBooking` | `lib/actions/public.ts` |
| `createMercadoPagoPreference` | `lib/actions/public-payment.ts` |

**Deuda técnica documentada**: En serverless (Vercel), reemplazar por Redis o Upstash.

### 4.5 Zod Validation — Schemas completos para server actions públicas

**Validar TODAS las server actions públicas** con `validateOrThrow()`:

| Server Action | Schema | Archivo |
|---|---|---|
| `searchAvailableRooms` | `SearchRoomsSchema` | `public.ts` |
| `createPublicBooking` | `CreateBookingSchema` (definido en `_lib/booking-schemas.ts`) | `public.ts` |
| `createMercadoPagoPreference` | `CreatePreferenceSchema` | `public-payment.ts` |

### 4.6 CSP (corregido — reemplazar Paddle por Mercado Pago)

**Archivo**: `next.config.ts` **[MODIFICAR]**

```
# EXTENDER las directivas existentes (NO reemplazar)
script-src 'self' 'unsafe-eval' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https://cloud.appwrite.io https://http2.mlstatic.com https://*.mercadopago.com https://*.mercadolibre.com
font-src 'self' data: https://fonts.gstatic.com
connect-src 'self' https://*.appwrite.io https://api.mercadopago.com
frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com
form-action 'self' https://*.mercadopago.com https://*.mercadolibre.com
```

Eliminar `*.paddle.com` y `*.paddleimages.com` de booking (conservar solo si hay suscripciones activas con overlay de Paddle).

**Security headers adicionales**:
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### 4.7 Permission Model
- Webhook usa `createAdminClient()` + token de plataforma
- Documentos PAGO: permisos para `bookingDoc.userId` (propertyUserId)
- `createPublicBooking` lee userId de roomDoc, no del cliente
- `createMercadoPagoPreference` usa token del seller (via OAuth), no de plataforma

### 4.8 Índices Appwrite

**Colección RESERVA**:
1. `receipt` — Key (ASC)
2. `groupId` — Key (ASC)
3. `userId + fechaInicio` — Key compuesto (ASC, DESC)
4. `habitacionId + fechaInicio + fechaFin` — Key compuesto (ASC, ASC, ASC)

**Colección PAGO**:
1. `receipt` — **Unique** (ASC) — **crítico**
2. `bookingId` — Key (ASC)

**Colección SUBSCRIPTION (Property)**:
- `mp_access_token` — String (token de acceso MP del owner)
- `mp_refresh_token` — String (token de refresh MP del owner)
- `mp_user_id` — String (ID de usuario MP del owner)
- `mp_connected_at` — DateTime

### 4.9 Error Boundaries
- `error.tsx` en booking home, results, checkout, confirmation

---

## Fase 5: SEO (detalle completo)

### 5.1 Hreflang Dinámico — Fix completo (8 archivos)

**Archivo**: `lib/seo.ts` **[MODIFICAR]** — ISO 639-1:

```typescript
export function getHreflang(locale: string, pathname: string) {
  const BASE_URL = process.env.APP_URL || "https://sart.app"
  const LOCALES = ["es", "en", "pt"]
  return {
    canonical: `${BASE_URL}/${locale}${pathname}`,
    languages: {
      ...Object.fromEntries(LOCALES.map(l => [l, `${BASE_URL}/${l}${pathname}`])),
      "x-default": `${BASE_URL}/es${pathname}`,
    },
  }
}
```

**Archivo**: `app/[locale]/layout.tsx` **[MODIFICAR]** — hreflang dinámico por página:

```typescript
const headersList = await headers()
const pathname = headersList.get("x-pathname") ?? `/${locale}`

alternates: {
  canonical: `${BASE_URL}/${locale}${pathname}`,
  languages: {
    es: `${BASE_URL}/es${pathname}`,
    en: `${BASE_URL}/en${pathname}`,
    pt: `${BASE_URL}/pt${pathname}`,
    "x-default": `${BASE_URL}/es${pathname}`,
  },
},
```

**Archivo**: `app/[locale]/book/[slug]/layout.tsx` **[MODIFICAR]** — locale REAL de `params`:

```typescript
const { locale, slug } = await params
alternates: getHreflang(locale, `/book/${slug}`),
```

**Archivos (cambian automáticamente)**: `page.tsx`, `signin/page.tsx`, `signup/page.tsx`, `pricing/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `refund/page.tsx`.

### 5.2 JSON-LD — Schema Generators específicos para booking

**Archivo nuevo**: `lib/json-ld.ts`

```typescript
export function hotelSchema({
  name, slug, description, telephone, address, imageUrl,
  priceRange, url,
}: {
  name: string; slug: string; description?: string; telephone?: string;
  address?: string; imageUrl?: string; priceRange?: string; url?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "@id": `${url || `https://sart.app/book/${slug}`}#hotel`,
    name,
    description,
    telephone,
    address: address ? { "@type": "PostalAddress", streetAddress: address } : undefined,
    image: imageUrl,
    priceRange: priceRange || "$$",
    url: url || `https://sart.app/book/${slug}`,
  }
}

export function breadcrumbList(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function webPageSchema({ name, description, url }: { name: string; description?: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
  }
}
```

**Uso en booking layout**: Renderizar `<script type="application/ld+json">` con `hotelSchema()` y `breadcrumbList()`.

### 5.3 OG Image Dinámica

**Archivo nuevo**: `app/api/og/route.tsx` — usando `next/og` (Satori + React):

```tsx
import { ImageResponse } from "next/og"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const hotelName = searchParams.get("name") || "Hotel"
  const primaryColor = searchParams.get("color") || "#C96A4F"

  return new ImageResponse(
    <div style={{ background: primaryColor, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: "white", fontSize: 64, fontFamily: "sans-serif" }}>{hotelName}</h1>
    </div>,
    { width: 1200, height: 630 }
  )
}
```

**Uso en metadata del booking layout**:
```typescript
openGraph: {
  images: [{ url: `${APP_URL}/api/og?name=${encodeURIComponent(hotelName)}&color=${encodeURIComponent(primaryColor)}` }],
}
```

### 5.4 Sitemap — lastModified real

**`app/sitemap.ts`** — usar `updatedAt` de cada propiedad:
```typescript
const properties = await getAllPropertySlugs()
const propertyEntries = properties.flatMap(p =>
  locales.map(locale => ({
    url: `${BASE_URL}/${locale}/book/${p.slug}`,
    lastModified: p.updatedAt || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))
)
```

**Extender `getAllPropertySlugs()`** para retornar `updatedAt`.

### 5.5 robots.txt

**Archivo nuevo**: `app/robots.ts`
```typescript
import type { MetadataRoute } from "next"
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/api/"] },
    ],
    sitemap: "https://sart.app/sitemap.xml",
  }
}
```

### 5.6 Metadata por página de booking

| Página | robots | OG | Indexable |
|--------|--------|----|-----------|
| Home (`/book/[slug]`) | `index, follow` | Hotel name + banner | ✅ SC con contenido |
| Results | `noindex, follow` | Search params | ❌ Client Component |
| Checkout | `noindex, nofollow` | — | ❌ Datos sensibles |
| Confirmation | `noindex, nofollow` | — | ❌ Datos privados |

### 5.7 Performance SEO
- DayPicker dynamic import + ssr:false ✓
- Contenido indexable via SC ✓
- Imágenes con next/image + dimensiones explícitas ✓
- Preconnect Google Fonts ✓

---

## Fase 6: Personalización Visual desde Settings (detalle completo)

### 6.1 Data Layer — Extender tipos

**`lib/definitions.ts` — Agregar a `User`**:
```typescript
export type User = {
  // ...existing
  themePreset?: string
  themePrimary?: string
  themeSecondary?: string
  themeBackground?: string
  themeFontHeading?: string
  themeFontBody?: string
}
```

**`lib/actions/property.ts` — Extender `PropertySettings`**:
```typescript
export interface PropertySettings {
  hotelName?: string
  propertySlug?: string
  currencySymbol?: string
  hotelLogoId?: string
  hotelBannerId?: string
  // Theme
  themePreset?: string
  themePrimary?: string
  themeSecondary?: string
  themeBackground?: string
  themeFontHeading?: string
  themeFontBody?: string
}
```

**`lib/actions/auth.ts` — Extender `getLoggedInUser()`**:
```typescript
const UserMapped = {
  // ...existing
  themePreset: portalPrefs?.themePreset || 'tropical',
  themePrimary: portalPrefs?.themePrimary || '#C96A4F',
  themeSecondary: portalPrefs?.themeSecondary || '#367A6E',
  themeBackground: portalPrefs?.themeBackground || '#F7F4EF',
  themeFontHeading: portalPrefs?.themeFontHeading || 'Sora',
  themeFontBody: portalPrefs?.themeFontBody || 'DM Sans',
}
```

### 6.2 `lib/color-utils.ts` — Versión completa

```typescript
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function darken(hex: string, percent: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * (1 - percent / 100))
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * (1 - percent / 100))
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * (1 - percent / 100))
  return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("")}`
}

export function lighten(hex: string, percent: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * percent / 100)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * percent / 100)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * percent / 100)
  return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("")}`
}

export function getContrastColor(hex: string): '#FFFFFF' | '#1A1A1A' {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1A1A1A' : '#FFFFFF'
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

export function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}
```

### 6.3 Componentes de UI de Settings

**5 componentes nuevos en `components/book/`**:

| Componente | Props | Descripción |
|---|---|---|
| `theme-preset-selector.tsx` | `selected, onChange` | 6 círculos de color con check animado |
| `color-picker-field.tsx` | `label, value, onChange` | `<input type="color">` + hex label |
| `font-selector.tsx` | `headingValue, bodyValue, onChange` | Dropdown de 3 pares tipográficos |
| `image-upload-field.tsx` | `type, currentFileId, onUpload, onDelete` | Drag & drop + preview |
| `theme-preview.tsx` | `primary, secondary, background, fontHeading, fontBody` | Preview en vivo del portal |

### 6.4 Theme Presets (6 presets)

| Preset | Primary | Secondary | Background | Heading | Body |
|--------|---------|-----------|------------|---------|------|
| Tropical | `#C96A4F` | `#367A6E` | `#F7F4EF` | Sora | DM Sans |
| Ocean | `#1A5F7A` | `#7BC4C4` | `#F0F7FA` | Sora | DM Sans |
| Forest | `#3A7A4F` | `#D4A853` | `#F4F7F0` | Sora | DM Sans |
| Sunset | `#D4734E` | `#7B5EA7` | `#FFF5F0` | Playfair Display | Lato |
| Monochrome | `#2D2D2D` | `#6B6B6B` | `#FAFAFA` | Plus Jakarta Sans | Inter |
| Boutique | `#7A2E4A` | `#C4A44A` | `#FFF8F5` | Playfair Display | Lato |

### 6.5 Settings UI — Sección en Settings Page

**`app/[locale]/dashboard/settings/page.tsx`** — Agregar:

```tsx
// Estado local nuevo
const [themePreset, setThemePreset] = useState(user?.themePreset || 'tropical')
const [themePrimary, setThemePrimary] = useState(user?.themePrimary || '#C96A4F')
const [themeSecondary, setThemeSecondary] = useState(user?.themeSecondary || '#367A6E')
const [themeBackground, setThemeBackground] = useState(user?.themeBackground || '#F7F4EF')
const [themeFontHeading, setThemeFontHeading] = useState(user?.themeFontHeading || 'Sora')
const [themeFontBody, setThemeFontBody] = useState(user?.themeFontBody || 'DM Sans')

const PRESETS = {
  tropical:   { primary: '#C96A4F', secondary: '#367A6E', background: '#F7F4EF' },
  ocean:      { primary: '#1A5F7A', secondary: '#7BC4C4', background: '#F0F7FA' },
  forest:     { primary: '#3A7A4F', secondary: '#D4A853', background: '#F4F7F0' },
  sunset:     { primary: '#D4734E', secondary: '#7B5EA7', background: '#FFF5F0' },
  monochrome: { primary: '#2D2D2D', secondary: '#6B6B6B', background: '#FAFAFA' },
  boutique:   { primary: '#7A2E4A', secondary: '#C4A44A', background: '#FFF8F5' },
}

const handlePresetSelect = (id: string) => {
  const p = PRESETS[id as keyof typeof PRESETS]
  setThemePreset(id)
  setThemePrimary(p.primary)
  setThemeSecondary(p.secondary)
  setThemeBackground(p.background)
}

const handleResetTheme = () => {
  handlePresetSelect('tropical')
  setThemeFontHeading('Sora')
  setThemeFontBody('DM Sans')
}

// Save handler extendido
const handleSaveSettings = async () => {
  const result = await updatePropertySettings({
    hotelName, propertySlug, currencySymbol,
    themePreset, themePrimary, themeSecondary, themeBackground,
    themeFontHeading, themeFontBody,
  })
}
```

**JSX de la sección**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Personalización Visual del Portal</CardTitle>
    <CardDescription>Personaliza los colores, fuentes e imágenes de tu portal de reservas público.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <ThemePresetSelector selected={themePreset} onChange={handlePresetSelect} />
    <div className="grid grid-cols-2 gap-4">
      <ColorPickerField label="Color primario" value={themePrimary} onChange={setThemePrimary} />
      <ColorPickerField label="Color secundario" value={themeSecondary} onChange={setThemeSecondary} />
      <ColorPickerField label="Color de fondo" value={themeBackground} onChange={setThemeBackground} />
      <FontSelector headingValue={themeFontHeading} bodyValue={themeFontBody} onChange={handleFontChange} />
    </div>
    <ImageUploadField type="logo" currentFileId={user?.hotelLogoId} onUpload={handleUploadLogo} onDelete={handleDeleteLogo} />
    <ImageUploadField type="banner" currentFileId={user?.hotelBannerId} onUpload={handleUploadBanner} onDelete={handleDeleteBanner} />
    <ThemePreview primary={themePrimary} secondary={themeSecondary} background={themeBackground} fontHeading={themeFontHeading} fontBody={themeFontBody} />
    <div className="flex gap-3">
      <Button onClick={handleResetTheme} variant="outline">Restablecer valores predeterminados</Button>
    </div>
  </CardContent>
</Card>
```

### 6.6 Theme Engine — BookingThemeProvider conectado con datos guardados

**Archivo**: `components/book/booking-theme-provider.tsx` — Client Component que:

1. Recibe `theme: ThemeConfig` desde el layout servidor
2. Importa 6 font families de `next/font/google`
3. Mapa `FONT_MAP` de heading → body
4. Computa CSS vars con `useMemo` (primary hover, primary muted, secondary light, contrast colors)
5. Renderiza `<div>` contenedor con `style={cssVars}` y clases de fuente

```typescript
type ThemeConfig = {
  themePrimary: string
  themeSecondary: string
  themeBackground: string
  themeFontHeading: string
  themeFontBody: string
}

const FONT_MAP = {
  'Sora': 'var(--font-sora)',
  'DM Sans': 'var(--font-dm-sans)',
  'Playfair Display': 'var(--font-playfair)',
  'Lato': 'var(--font-lato)',
  'Plus Jakarta Sans': 'var(--font-plus-jakarta)',
  'Inter': 'var(--font-inter)',
} as const
```

Overrides por propiedad via data attributes:
```css
:root:has(.booking-theme[data-primary="#1A5F7A"]) {
  --primary: 202 65% 29%;
}
:root:has(.booking-theme[data-secondary="#7BC4C4"]) {
  --secondary: 180 40% 63%;
}
```

### 6.7 Sección "Conectar Mercado Pago"

En `settings/page.tsx`, agregar dentro del mismo Card o en Card separado:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Conectar Mercado Pago</CardTitle>
    <CardDescription>Conecta tu cuenta de Mercado Pago para recibir pagos online.</CardDescription>
  </CardHeader>
  <CardContent>
    {user?.mp_access_token ? (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span>Cuenta conectada</span>
        </div>
        <Button variant="destructive" onClick={handleDisconnectMp}>Desconectar</Button>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Conectá tu cuenta de Mercado Pago para que tus huéspedes puedan pagar la seña online.</p>
        <Button onClick={handleConnectMp}>Conectar Mercado Pago</Button>
      </div>
    )}
  </CardContent>
</Card>
```

### 6.8 Limpieza funciones duplicadas

| Acción | Archivo | Detalle |
|--------|---------|---------|
| Renombrar | `lib/actions/user.ts` | `updatePropertySettings` → `updateSubscriptionSettings` |
| Eliminar | `lib/actions/user.ts` | `uploadHotelLogo` (canónica es `uploadPropertyImage` en `property.ts`) |
| Unificar | `lib/definitions.ts` | Mover `PropertySettings` interface aquí (eliminar duplicado local en `property.ts`) |

---

## Resumen de Archivos por Fase (v3.1 Completo)

| Fase | Creados | Modificados |
|------|---------|-------------|
| **0** | `booking-stepper.tsx`, `booking-theme-provider.tsx`, `color-utils.ts` | `book/[slug]/layout.tsx`, `tailwind.config.ts`, `globals.css`, `page.tsx`, `results/page.tsx`, `checkout/page.tsx`, `confirmation/page.tsx` (color conversion) |
| **1** | `_lib/booking-schemas.ts`, `_lib/booking-types.ts`, `_lib/booking-url-params.ts`, `_validation.ts` | `lib/definitions.ts`, `add-payment-dialog.tsx`, `lib/actions/user.ts` (rename), `lib/actions/property.ts`, `.env.local`, `.env.example`, `messages/{es,en,pt}.json` |
| **2** | `search-widget.tsx`, `guest-counter.tsx`, `room-card.tsx`, `booking-summary.tsx`, `mobile-date-strip.tsx`, `info-cards.tsx`, `booking-json-ld.tsx`, `RoomCard.tsx`, `StickySearchBar.tsx`, `ResultsEmpty.tsx`, `useAvailabilitySearch.ts`, `GuestInfoForm.tsx`, `useCheckoutForm.ts`, `BookingDetailsCard.tsx`, `MercadoPagoCheckoutButton.tsx`, `error.tsx` (x4) | `page.tsx` (→ SC), `page.client.tsx` (→ CC), `results/page.tsx`, `checkout/page.tsx`, `confirmation/page.tsx`, `layout.tsx` |
| **3** | `mercadopago.ts`, `public-payment.ts` (reescrito), `mercadopago-webhook.ts`, `mercadopago-oauth.ts`, `webhooks/mercadopago/route.ts`, `mercadopago/oauth/route.ts`, `MercadoPagoCheckoutButton.tsx` | `public.ts`, `webhooks/paddle/route.ts` (limpiar eventos booking), `definitions.ts` (PropertySettings + mp tokens), `.env.local`, `.env.example`, `settings/page.tsx` |
| **4** | `lib/rate-limiter.ts` | `next.config.ts` (CSP + headers), `public.ts` (rate limit), `public-payment.ts` (rate limit), `_validation.ts` (schemas servidor) |
| **5** | `lib/json-ld.ts`, `app/api/og/route.tsx`, `app/robots.ts` | `lib/seo.ts` (ISO 639-1), `app/[locale]/layout.tsx` (hreflang dinámico), `app/[locale]/book/[slug]/layout.tsx` (locale real), `app/sitemap.ts` (lastModified), `lib/actions/property.ts` (getAllPropertySlugs + updatedAt) |
| **6** | `theme-preset-selector.tsx`, `color-picker-field.tsx`, `font-selector.tsx`, `image-upload-field.tsx`, `theme-preview.tsx` | `lib/definitions.ts` (User type), `lib/actions/property.ts` (PropertySettings), `lib/actions/auth.ts` (getLoggedInUser), `settings/page.tsx`, `globals.css` (:root:has), `booking-theme-provider.tsx`, `lib/actions/user.ts` (rename + delete) |

**Totales: 40 archivos creados, 38 archivos modificados = 78 archivos involucrados**

---

## Acciones Externas Requeridas (v3.1)

1. ✅ **Mercado Pago Developers**: Crear aplicación → Obtener `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_PLATFORM_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY`
2. ✅ **Mercado Pago Developers**: Configurar Redirect URI en la aplicación → `{BASE_URL}/api/mercadopago/oauth`
3. ✅ **Mercado Pago Developers**: Configurar Webhook → URL `{BASE_URL}/api/webhooks/mercadopago` + evento `Payment` + copiar `MP_WEBHOOK_SECRET`
4. ✅ **Appwrite Console**: Verificar colección PAGO existe y acepta `method: 'MercadoPago'`
5. ✅ **Appwrite Console**: Agregar a SUBSCRIPTION/Property: `mp_access_token`, `mp_refresh_token`, `mp_user_id`, `mp_connected_at`
6. ✅ **Appwrite Console**: Verificar RESERVA tiene `pagoAbonado` (Double), `paymentMethod` (String), `groupId` (String)
7. ✅ **Appwrite Console**: **Unique Index** en PAGO.receipt (ASC)
8. ✅ **Appwrite Console**: Índices en RESERVA: `groupId`, `receipt`, `userId+fechaInicio`, `habitacionId+fechaInicio+fechaFin`
9. ✅ **Appwrite Console**: Índice en PAGO: `bookingId`
10. ✅ **Google Fonts**: 6 fuentes disponibles en `next/font/google`
11. ⚠️ **Bucket Appwrite Storage**: Verificar bucket para logo/banner upload

---

## Orden de Implementación Sugerido (v3.1 Completo)

```
Pre-Fase (inmediato):
  ├── Crear app Mercado Pago Developers y obtener credenciales
  ├── Configurar Redirect URI en app MP
  ├── Crear Unique Index en PAGO.receipt (Appwrite Console)
  ├── Agregar campos mp_* a SUBSCRIPTION collection en Appwrite
  └── Agregar dominios *.mercadopago.com a CSP (form-action + img-src)

Fase 0 (setup diseño + color conversion):
  ├── :root:has(.booking-theme) en globals.css
  ├── Fuentes + preconnect en booking layout
  ├── tailwind.config.ts con fontFamily
  ├── color-utils.ts
  ├── BookingThemeProvider (solo clase, sin wrapper div)
  ├── BookingStepper
  └── Convertir colores hardcodeados slate → theme-aware en booking pages

Fase 0.5 (limpieza previa):
  ├── Renombrar updatePropertySettings → updateSubscriptionSettings en user.ts
  ├── Eliminar uploadHotelLogo de user.ts
  └── Unificar PropertySettings en definitions.ts

Fase 1 (fundación):
  ├── Zod schemas + _validation.ts
  ├── URL params serialization
  ├── Payment.method: 'MercadoPago' en definitions.ts + add-payment-dialog (3 archivos)
  ├── PropertySettings + mp tokens + theme fields en definitions.ts
  ├── Env vars (MP_* reemplazan PADDLE_*)
  └── i18n keys

Fase 2 (componentes + i18n + rediseño):
  ├── SC/CC split home
  ├── SearchWidget + RoomCard + StickySearchBar + etc.
  ├── Checkout + MercadoPagoCheckoutButton (redirección simple, sin overlay)
  ├── Confirmation + BookingDetailsCard
  ├── Layout con locale dinámico + metadata SEO
  └── Error boundaries

Fase 3 (pagos — Mercado Pago):
  ├── lib/mercadopago.ts — singleton plataforma
  ├── lib/actions/mercadopago-oauth.ts — OAuth flow
  ├── app/api/mercadopago/oauth/route.ts — callback OAuth
  ├── lib/actions/public-payment.ts — createMercadoPagoPreference (token del seller)
  ├── lib/actions/mercadopago-webhook.ts — handleCompletedPayment
  ├── app/api/webhooks/mercadopago/route.ts — webhook con validación HMAC
  ├── components/book/mercadopago-checkout-button.tsx — botón redirección
  ├── lib/actions/public.ts — createPublicBooking mejorado (userId de DB + rate limit)
  ├── app/api/webhooks/paddle/route.ts — limpiar eventos booking
  └── Settings: sección "Conectar Mercado Pago"

Fase 4 (seguridad — hardening post-pagos):
  ├── lib/rate-limiter.ts — implementación concreta
  ├── Integrar rate limit en public.ts + public-payment.ts
  ├── Zod schemas de servidor en _validation.ts (SearchRoomsSchema, CreatePreferenceSchema)
  ├── CSP definitivo (MP domains + security headers extra)
  └── Permission model + idempotencia verificada

Fase 5 (SEO — visibilidad post-lanzamiento):
  ├── lib/json-ld.ts — hotelSchema, breadcrumbList, webPageSchema
  ├── lib/seo.ts — ISO 639-1 (es/en/pt + x-default)
  ├── app/[locale]/layout.tsx — hreflang dinámico por página
  ├── app/[locale]/book/[slug]/layout.tsx — locale real de params
  ├── app/api/og/route.tsx — OG image dinámica
  ├── app/sitemap.ts — lastModified real
  ├── app/robots.ts — robots.txt
  └── 6 páginas afectadas automáticamente via getHreflang()

Fase 6 (personalización visual — UX final):
  ├── Extender tipos: User + PropertySettings + getLoggedInUser
  ├── lib/color-utils.ts — versión completa de utilidades
  ├── 5 componentes UI: ThemePresetSelector, ColorPickerField, FontSelector,
  │   ImageUploadField, ThemePreview
  ├── settings/page.tsx — sección "Personalización Visual del Portal"
  ├── BookingThemeProvider — conexión con datos guardados
  ├── :root:has(.booking-theme) overrides por propiedad
  └── settings/page.tsx — sección "Conectar Mercado Pago"
```

---

## Checklist de Validación Post-Implementación (v3.1 Completo)

### 🔴 Seguridad Crítica
- [ ] Validación de firma `x-signature` en webhook MP (HMAC-SHA256 + timingSafeEqual)
- [ ] `MP_WEBHOOK_SECRET` validado antes de procesar webhook (sin `|| ''`)
- [ ] Webhook fuerza `source_news=webhooks` para evitar IPN no verificables
- [ ] CSP incluye `*.mercadopago.com` en **form-action** + `*.mercadolibre.com`
- [ ] CSP incluye `fonts.gstatic.com` en font-src
- [ ] `createPublicBooking` lee userId de roomDoc (no del cliente)
- [ ] `handleCompletedPayment` valida monto
- [ ] Unique index en PAGO.receipt existe en Appwrite
- [ ] Zod validation en TODAS las server actions públicas
- [ ] Rate limiting activo en public.ts y public-payment.ts
- [ ] OAuth state parameter usado como CSRF (userId en state)

### 🧩 Integración Pagos
- [ ] `createMercadoPagoPreference` usa token del seller (no de plataforma)
- [ ] `external_reference` = bookingId para tracking
- [ ] MercadoPagoCheckoutButton redirige a `init_point` correctamente
- [ ] `handleCompletedPayment` usa admin client + `syncBookingTotalInternal` self-contained
- [ ] Webhook preserva eventos de suscripción Paddle existentes
- [ ] Idempotencia funciona: mismo webhook 2 veces no duplica
- [ ] OAuth: owner conecta su cuenta MP desde Settings
- [ ] OAuth: tokens se guardan en PropertySettings
- [ ] OAuth: desconexión funciona correctamente
- [ ] Sin `marketplace_fee` — 0% comisión

### 🎨 Frontend
- [ ] `:root:has(.booking-theme)` en globals.css (NO wrapper div)
- [ ] Portales shadcn (SelectContent, PopoverContent, DialogContent) heredan variables del booking
- [ ] Colores hardcodeados `slate-*` convertidos a CSS variables
- [ ] `react-day-picker` v8: usa `modifiers` + `modifiersStyles` (NO `--rdp-accent-color`)
- [ ] DayPicker con dynamic import + ssr:false
- [ ] `fontFamily.sans` agregado sin romper dashboard (Geist como fallback)
- [ ] Settings: sección "Personalización Visual" con 5 componentes funcionales
- [ ] Settings: sección "Conectar Mercado Pago" functional
- [ ] Theme preview en vivo se actualiza en cada cambio

### 🌐 SEO
- [ ] Hreflang ISO 639-1 (`es`/`en`/`pt`) en seo.ts, root layout, booking layout
- [ ] Booking layout usa locale REAL de `params` (no hardcodeado `"es"`)
- [ ] 6 páginas afectadas automáticamente via `getHreflang()`
- [ ] JSON-LD Hotel + BreadcrumbList en booking layout
- [ ] OG image dinámica desde API route
- [ ] Sitemap con `lastModified` dinámico
- [ ] robots.txt con disallow para /dashboard/ y /api/

### 🗄️ Database
- [ ] Unique index en PAGO.receipt
- [ ] Índices compuestos en RESERVA
- [ ] Campos mp_* agregados a PropertySettings/SUBSCRIPTION
- [ ] `updatePropertySettings` → `updateSubscriptionSettings` renombrado
- [ ] `uploadHotelLogo` eliminado de user.ts
- [ ] PropertySettings unificada en definitions.ts

### 📊 Build
- [ ] `pnpm build` sin errores de tipos
- [ ] `pnpm lint` sin errores
