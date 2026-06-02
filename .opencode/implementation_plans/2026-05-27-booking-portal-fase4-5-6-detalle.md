# Plan Extendido — Fase 4, 5 y 6 (Booking Portal Unificado v3.1)

Fecha: 2026-05-27
Basado en: `2026-05-21-booking-portal-unificado.md` — Extension de Fase 4 (Seguridad), 5 (SEO), 6 (Personalizacion Visual)

---

## Fase 4: Seguridad y Hardening

### 4.1 Rate Limiting — Implementacion concreta

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

**Uso en server actions publicas** — `searchAvailableRooms`, `createPublicBooking`, `createMercadoPagoPreference`:

```typescript
import { headers } from "next/headers"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function createPublicBooking(data: unknown) {
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for") ?? "unknown"
  const { allowed } = checkRateLimit(ip)
  if (!allowed) throw new Error("Demasiadas solicitudes. Intenta de nuevo en 1 minuto.")
  // ...
}
```

**Deuda tecnica documentada**: En serverless (Vercel), reemplazar por Redis o Upstash.

---

### 4.2 Zod Validation — Schemas completos para server actions publicas

**Archivo**: `lib/actions/_validation.ts` — Incluir schemas COMPLETOS:

```typescript
export const SearchRoomsSchema = z.object({
  userId: z.string().min(1).max(36),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(100),
})

export const CreateBookingSchema = z.object({
  propertyUserId: z.string().min(1).max(36),
  habitacionId: z.string().min(1).max(36),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  huespedes: z.coerce.number().int().min(1).max(100),
  guestName: z.string().min(2).max(100).trim(),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().max(20).optional(),
  guestDni: z.string().max(20).optional(),
  arrivalTime: z.string().max(5).optional(),
  breakfast: z.coerce.boolean().default(false),
  notes: z.string().max(500).optional(),
  montoTotal: z.coerce.number().positive().max(999999),
  selectedBeds: z.array(z.string().max(36)).optional(),
  ratePlanId: z.string().max(36).optional(),
})

export const CreatePreferenceSchema = z.object({
  bookingId: z.string().min(1).max(36),
  guestEmail: z.string().email().optional().or(z.literal("")),
})
```

**Validar TODAS las server actions publicas** con `validateOrThrow()`:

| Server Action | Schema | Archivo |
|---------------|--------|---------|
| `searchAvailableRooms` | `SearchRoomsSchema` | `public.ts` |
| `createPublicBooking` | `CreateBookingSchema` | `public.ts` |
| `createMercadoPagoPreference` | `CreatePreferenceSchema` | `public-payment.ts` |

---

### 4.3 CSP — Actualizacion definitiva

**Archivo**: `next.config.ts` — Directivas CSP actualizadas:

```
img-src 'self' data: blob: https://cloud.appwrite.io https://http2.mlstatic.com https://*.mercadopago.com https://*.mercadolibre.com;
font-src 'self' data: https://fonts.gstatic.com;
connect-src 'self' https://*.appwrite.io https://api.mercadopago.com;
frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com;
form-action 'self' https://*.mercadopago.com https://*.mercadolibre.com;
```

Eliminar `*.paddle.com` y `*.paddleimages.com` de booking (conservar solo si hay suscripciones activas con overlay de Paddle).

---

### 4.4 Security Headers faltantes

Agregar en `next.config.ts`:

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

---

### 4.5 Permission Model (Zod + Appwrite)

- `createPublicBooking`: userId se lee de `roomDoc.userId` (NUNCA del input del cliente)
- Documentos PAGO: permisos `Permission.*(Role.user(bookingDoc.userId))`
- Webhook usa exclusivamente `createAdminClient()`

---

### 4.6 Idempotencia en Webhook

```typescript
const existing = await databases.listDocuments(DATABASE_ID, COLL_PAGO, [
  Query.equal('receipt', mpPaymentId)
])
if (existing.total > 0) return { success: true, duplicate: true }
```

---

## Fase 5: SEO

### 5.1 Hreflang Dinamico — Fix completo (8 archivos)

**`lib/seo.ts` — Actualizar a ISO 639-1**:

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

**`app/[locale]/layout.tsx`** — Hreflang dinamico por pagina:

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

**`app/[locale]/book/[slug]/layout.tsx`**:

```typescript
const { locale, slug } = await params
alternates: getHreflang(locale, `/book/${slug}`),
```

**Archivos restantes** que usan `getHreflang` automaticamente: `page.tsx`, `signin/page.tsx`, `signup/page.tsx`, `pricing/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `refund/page.tsx`

---

### 5.2 JSON-LD — Schema Generators especificos para booking

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

---

### 5.3 OG Image Dinamica

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

---

### 5.4 Sitemap — lastModified real

**`app/sitemap.ts`**:

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

---

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

---

### 5.6 Metadata por pagina de booking

| Pagina | robots | OG | Indexable |
|--------|--------|----|-----------|
| Home (`/book/[slug]`) | `index, follow` | Hotel name + banner | Server Component con contenido |
| Results | `noindex, follow` | Search params | Client Component |
| Checkout | `noindex, nofollow` | — | Datos sensibles |
| Confirmation | `noindex, nofollow` | — | Datos privados |

---

## Fase 6: Personalizacion Visual desde Settings

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

---

### 6.2 `lib/color-utils.ts` — Version completa (mover de `utils/` a `lib/`)

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

---

### 6.3 Componentes de UI de Settings

**5 componentes nuevos en `components/book/`**:

| Componente | Props | Descripcion |
|------------|-------|-------------|
| `theme-preset-selector.tsx` | `selected, onChange` | 6 circulos de color con check animado |
| `color-picker-field.tsx` | `label, value, onChange` | `<input type="color">` + hex label |
| `font-selector.tsx` | `headingValue, bodyValue, onChange` | Dropdown de 3 pares tipograficos |
| `image-upload-field.tsx` | `type, currentFileId, onUpload, onDelete` | Drag & drop + preview |
| `theme-preview.tsx` | `primary, secondary, background, fontHeading, fontBody` | Preview en vivo del portal |

**Presets**:

| ID | Primary | Secondary | Background | Heading | Body |
|----|---------|-----------|------------|---------|------|
| `tropical` | `#C96A4F` | `#367A6E` | `#F7F4EF` | Sora | DM Sans |
| `ocean` | `#1A5F7A` | `#7BC4C4` | `#F0F7FA` | Sora | DM Sans |
| `forest` | `#3A7A4F` | `#D4A853` | `#F4F7F0` | Sora | DM Sans |
| `sunset` | `#D4734E` | `#7B5EA7` | `#FFF5F0` | Playfair Display | Lato |
| `monochrome` | `#2D2D2D` | `#6B6B6B` | `#FAFAFA` | Plus Jakarta Sans | Inter |
| `boutique` | `#7A2E4A` | `#C4A44A` | `#FFF8F5` | Playfair Display | Lato |

---

### 6.4 Seccion en Settings Page

**`app/[locale]/dashboard/settings/page.tsx`** — Agregar dentro del Card existente:

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

**JSX de la seccion**:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Personalizacion Visual del Portal</CardTitle>
    <CardDescription>Personaliza los colores, fuentes e imagenes de tu portal de reservas publico.</CardDescription>
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

---

### 6.5 BookingThemeProvider — Conexion con datos guardados

**Archivo**: `components/book/booking-theme-provider.tsx` — Client Component que:

1. Recibe `theme: ThemeConfig` desde el layout servidor
2. Importa 6 font families de `next/font/google` (Sora, DM Sans, Playfair Display, Lato, Plus Jakarta Sans, Inter)
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

---

### 6.6 CSS Variables — `:root:has(.booking-theme)`

En `app/globals.css` (agregar AL FINAL, fuera de `@layer base`, sin modificar `:root` existente):

```css
:root:has(.booking-theme) {
  --background: 40 30% 97%;
  --foreground: 30 15% 15%;
  --primary: 8 60% 50%;
  --primary-foreground: 40 30% 97%;
  --secondary: 170 40% 35%;
  --secondary-foreground: 0 0% 100%;
  --accent: 30 60% 55%;
  --accent-foreground: 30 15% 15%;
  --muted: 40 20% 92%;
  --muted-foreground: 30 10% 45%;
  --border: 30 15% 85%;
  --input: 30 15% 85%;
  --ring: 8 60% 50%;
  --radius: 0.5rem;
}
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

---

### 6.7 Limpieza funciones duplicadas

| Accion | Archivo | Detalle |
|--------|---------|---------|
| Renombrar | `lib/actions/user.ts` | `updatePropertySettings` → `updateSubscriptionSettings` |
| Eliminar | `lib/actions/user.ts` | `uploadHotelLogo` (canonica es `uploadPropertyImage` en `property.ts`) |
| Unificar | `lib/definitions.ts` | Mover `PropertySettings` interface aqui (eliminar duplicado local en `property.ts`) |

---

## Resumen de Archivos por Fase (Extension)

| Fase | Creados | Modificados |
|------|---------|-------------|
| **4** | `lib/rate-limiter.ts`, `lib/actions/_validation.ts` (schemas nuevos) | `next.config.ts` (CSP + headers), `lib/actions/public.ts` (Zod + rate limit), `lib/actions/public-payment.ts` (Zod + rate limit) |
| **5** | `lib/json-ld.ts`, `app/api/og/route.tsx`, `app/robots.ts` | `lib/seo.ts` (ISO 639-1), `app/[locale]/layout.tsx` (hreflang dinamico), `app/[locale]/book/[slug]/layout.tsx` (locale real), `app/sitemap.ts` (lastModified), `lib/actions/property.ts` (getAllPropertySlugs + updatedAt) |
| **6** | `components/book/theme-preset-selector.tsx`, `color-picker-field.tsx`, `font-selector.tsx`, `image-upload-field.tsx`, `theme-preview.tsx`, `lib/color-utils.ts` | `lib/definitions.ts` (User type), `lib/actions/property.ts` (PropertySettings), `lib/actions/auth.ts` (getLoggedInUser), `app/[locale]/dashboard/settings/page.tsx` (nueva seccion), `app/globals.css` (:root:has), `components/book/booking-theme-provider.tsx`, `lib/actions/user.ts` (rename + delete) |

---

## Totales finales del plan completo (v3.1)

| Fase | Creados | Modificados |
|------|---------|-------------|
| 0 | 3 | 7 |
| 1 | 4 | 6 |
| 2 | 15 | 7 |
| 3 | 7 | 5 |
| 4 | 2 | 4 |
| 5 | 3 | 4 |
| 6 | 6 | 5 |
| **Total** | **40** | **38** |
