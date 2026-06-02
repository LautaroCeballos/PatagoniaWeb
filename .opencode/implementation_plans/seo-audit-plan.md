# Plan de Implementación — Auditoría SEO

## Resumen

15 archivos a modificar, 3 archivos nuevos. Organizado en 8 fases ejecutables secuencialmente.

---

## Fase 1: Preparación — infraestructura i18n + assets

### 1.1 Agregar claves de traducción SEO a `messages/{es,en,pt}.json`

En cada locale, agregar un namespace `Seo`:

```jsonc
"Seo": {
  "home": {
    "title": "Sistema Administrativo de Reservas Turísticas | SART"
  },
  "pricing": {
    "title": "Planes de Suscripción | SART",
    "desc": "Elige el plan ideal para tu alojamiento. Prueba gratis 30 días sin tarjeta de crédito."
  },
  "signin": {
    "title": "Iniciar Sesión | SART",
    "desc": "Accede a tu panel de gestión SART y administra tus reservas, huéspedes y habitaciones."
  },
  "signup": {
    "title": "Crear Cuenta | SART",
    "desc": "Regístrate gratis y comienza a gestionar tu alojamiento con SART. Prueba 30 días sin compromiso."
  },
  "terms": {
    "title": "Condiciones del Servicio | SART",
    "desc": "Términos y condiciones de uso de la plataforma SART para gestión de reservas turísticas."
  },
  "privacy": {
    "title": "Política de Privacidad | SART",
    "desc": "Política de privacidad y tratamiento de datos personales en la plataforma SART."
  },
  "refund": {
    "title": "Política de Reembolso | SART",
    "desc": "Política de reembolso y cancelación de suscripciones en SART."
  },
  "booking": {
    "title": "Reservá en {hotelName}",
    "desc": "Reservá tu estadía en {hotelName} de manera fácil y rápida. Habitaciones disponibles con los mejores precios."
  },
  "keywords": ["gestión de reservas", "turismo", "alojamientos", "software hotelero", "PMS", "SART"]
}
```

### 1.2 Arreglar typo en `messages/es.json`
`"Reservas Turisticas"` → `"Reservas Turísticas"` (line 10)

### 1.3 Actualizar `public/manifest.json`
`"start_url": "/"` → `"start_url": "/es"`

### 1.4 Agregar `apple-touch-icon.png`
Crear icono 180x180 en `public/` o copiar el 192px existente.

### 1.5 Eliminar SVGs starter no usados
Revisar `public/window.svg`, `vercel.svg`, `next.svg`, `globe.svg`, `file.svg` — eliminar si no se referencian.

---

## Fase 2: Core metadata — canónicos, hreflang, OG por página

### 2.1 Crear `lib/seo.ts` (helpers compartidos)

```typescript
// lib/seo.ts
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://sart.com";
const LOCALES = ['es', 'en', 'pt'] as const;
type Locale = (typeof LOCALES)[number];

const OG_LOCALE_MAP: Record<Locale, string> = {
  es: 'es_ES',
  en: 'en_US',
  pt: 'pt_BR',
};

export function getHreflang(locale: Locale, pathname: string) {
  return {
    canonical: `${BASE_URL}/${locale}${pathname}`,
    languages: Object.fromEntries(
      LOCALES.map(l => [`${OG_LOCALE_MAP[l]}`, `${BASE_URL}/${l}${pathname}`])
    ) as Record<string, string>,
  };
}

export function getOGLocale(locale: Locale): string {
  return OG_LOCALE_MAP[locale] || 'es_ES';
}

export function getMetadataBase() {
  return new URL(BASE_URL);
}

// --- JSON-LD helpers ---

export function organizationSchema(baseUrl: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SART",
    "url": baseUrl,
    "logo": `${baseUrl}/og-image.png`,
    "description": description,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url,
    })),
  };
}

export function productSchema(name: string, description: string, offers: { name: string; price: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": description,
    "offers": {
      "@type": "AggregateOffer",
      "offerCount": offers.length,
      "offers": offers.map(o => ({
        "@type": "Offer",
        "name": o.name,
        "price": o.price,
        "priceCurrency": "USD",
      })),
    },
  };
}

export function faqSchema(questions: { name: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": questions.map(q => ({
      "@type": "Question",
      "name": q.name,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.answer,
      },
    })),
  };
}
```

### 2.2 Reparar `app/[locale]/layout.tsx`

Cambios:
- `locale` en OG → usar `getOGLocale(locale)`
- `url` en OG → `${baseUrl}/${locale}` (homepage)
- `keywords` → cargar desde traducciones
- Agregar `Organization` JSON-LD en el body (componente `<Script>`)

### 2.3 Agregar `generateMetadata` completo a páginas públicas

Cada página debe llamar a `getHreflang(locale, pathname)` y retornar:
- `title`
- `description`
- `alternates.canonical`
- `alternates.languages`
- `openGraph` propio
- `twitter` propio

**Archivos a modificar:**

| Archivo | Acción |
|---------|--------|
| `app/[locale]/page.tsx` | Agregar `generateMetadata` completo con hero description |
| `app/[locale]/pricing/page.tsx` | Agregar desc + OG + alternates |
| `app/[locale]/signin/page.tsx` | Agregar desc + OG + alternates |
| `app/[locale]/signup/page.tsx` | Agregar desc + OG + alternates |
| `app/[locale]/terms/page.tsx` | Agregar desc + OG + alternates |
| `app/[locale]/privacy/page.tsx` | Agregar OG + alternates |
| `app/[locale]/refund/page.tsx` | Agregar OG + alternates |

### 2.4 Mejorar `app/[locale]/book/[slug]/layout.tsx`

Agregar al `generateMetadata` existente:
- `openGraph` con title/description del hotel (`og:image` si existe `hotelBannerId`)
- `twitter` card
- `alternates.canonical`
- `robots` condicional según subruta (ver Fase 5.2)

---

## Fase 3: Structured data (JSON-LD)

### 3.1 `Organization` schema en layout raíz
Agregar en `app/[locale]/layout.tsx` como componente `<Script>` dentro del body.

### 3.2 `BreadcrumbList` schema
Agregar helper que se pueda llamar desde cada página. Las páginas estáticas pueden hardcodear sus breadcrumbs; las booking pueden generarlos dinámicamente.

### 3.3 `Product` schema en pricing page
En `app/[locale]/pricing/page.tsx`, agregar schema con los planes de suscripción.

### 3.4 `FAQPage` schema en homepage
En `app/[locale]/page.tsx`, convertir la sección "¿Por qué cambiar?" en FAQ schema.

---

## Fase 4: Sitemap

### 4.1 Agregar `getAllPropertySlugs()` en `lib/actions/property.ts`

```typescript
export async function getAllPropertySlugs(): Promise<{ slug: string }[]> {
  try {
    const { users } = await createAdminClient();
    const { Query } = await import("node-appwrite");
    const slugs: { slug: string }[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await users.list([Query.limit(limit), Query.offset(offset)]);
      for (const user of response.users) {
        if (user.prefs?.propertySlug) {
          slugs.push({ slug: user.prefs.propertySlug });
        }
      }
      if (response.users.length < limit) break;
      offset += limit;
    }
    return slugs;
  } catch {
    return [];
  }
}
```

### 4.2 Refactorizar `app/sitemap.ts`

- Hacerlo `async`
- Agregar rutas dinámicas de `/book/{slug}` para cada locale
- Prioridades realistas: signin/signup → 0.3, booking pages → 0.8, homepage → 1.0
- Categorizar en static vs auth vs property routes

---

## Fase 5: robots.txt y noindex

### 5.1 Actualizar `app/robots.ts`

```typescript
rules: [
  {
    userAgent: '*',
    allow: '/',
    disallow: ['/api/', '/dashboard/', '/*/book/*/checkout', '/*/book/*/confirmation'],
  },
],
```

### 5.2 robots condicional en booking layout

En `app/[locale]/book/[slug]/layout.tsx`:
```typescript
const pathname = headers.get('next-url') || '';
const isTransactional = pathname.includes('/results') || pathname.includes('/checkout') || pathname.includes('/confirmation');
// En generateMetadata:
robots: isTransactional ? { index: false, follow: false } : undefined,
```

### 5.3 noindex dashboard completo

En `app/[locale]/dashboard/layout.tsx`, agregar:

```typescript
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
```

Esto protege automáticamente TODAS las rutas de dashboard.

---

## Fase 6: Open Graph dinámico

### 6.1 Crear `app/opengraph-image.tsx`

```typescript
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SART - Gestión de Reservas';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1A2035 50%, #0F766E 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: '#14B8A6', marginBottom: 16 }}>
          SART
        </div>
        <div style={{ fontSize: 36, color: '#E2E8F0', textAlign: 'center' }}>
          Sistema Administrativo de Reservas Turísticas
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

### 6.2 Mejorar OG image en booking layout
Si la propiedad tiene `hotelBannerId`, construir URL y usarla como `og:image` en vez del genérico.

---

## Fase 7: Páginas faltantes

### 7.1 Crear `app/[locale]/not-found.tsx`

```typescript
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Página no encontrada',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Página no encontrada</p>
      <Link href="/" className="text-primary hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
```

---

## Fase 8: Keywords y limpieza

### 8.1 Keywords localizadas
En `app/[locale]/layout.tsx`, cargar `t('Seo.keywords')` como array en vez de hardcodear español.

### 8.2 Static `public/robots.txt`
Evaluar si es necesario mantenerlo o eliminarlo (el dinámico ya lo genera Next.js).

---

## Orden de implementación sugerido

```
1.  Fase 1: i18n keys + assets
2.  Fase 5.3: noindex dashboard layout (rápido, protege)
3.  Fase 2.1: lib/seo.ts helpers
4.  Fase 2.2: layout raíz (OG locale, canonical)
5.  Fase 2.3: metadata páginas públicas (una por una)
6.  Fase 2.4: booking layout metadata
7.  Fase 5.1-5.2: robots.ts + robots condicional booking
8.  Fase 6: OG image dinámica
9.  Fase 4: sitemap
10. Fase 3: JSON-LD
11. Fase 7: 404 page
12. Fase 8: keywords + limpieza
```
