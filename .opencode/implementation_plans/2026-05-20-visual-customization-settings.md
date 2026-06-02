# Visual Customization Portal — Dashboard Settings & Booking Portal Theming

## 1. Objetivo

Agregar una sección de **"Personalización Visual del Portal"** en la página de ajustes del dashboard que permita a los propietarios de establecimientos personalizar los colores, fuentes, logo e imagen de banner de su portal de reservas público (`/book/[slug]`). Los cambios deben reflejarse en vivo en una vista previa y aplicarse dinámicamente en el frontend público mediante CSS custom properties.

## 2. Contexto actual

- La página `app/[locale]/dashboard/settings/page.tsx` es un componente cliente que lee `user` de `useAppContext()`.
- Actualmente solo tiene: nombre del hotel, slug (URL), moneda.
- Los datos se guardan en **Appwrite user prefs** mediante `updatePropertySettings()` en `lib/actions/property.ts`.
- El portal público (`app/[locale]/book/[slug]/layout.tsx`) es un Server Component que obtiene los datos vía `getPropertyBySlug()` y renderiza un layout con fondo gradiente y header minimalista.
- El logo y banner ya se pueden subir mediante `uploadPropertyImage()` / `deletePropertyImage()` y se almacenan como `hotelLogoId` / `hotelBannerId` en prefs.
- La UI usa shadcn/ui (new-york), Tailwind CSS v3 con CSS variables, `lucide-react` para íconos.
- Fuente global: Geist (local). El booking layout no carga fuentes adicionales.

## 3. Problema

No existe forma de que un propietario personalice la identidad visual de su portal. Todos los portales se ven iguales (fondo slate, botones primary según el tema global de shadcn). No hay:
- Selector de temas predefinidos
- Pickers de color manuales
- Subida de logo/banner integrada en la UI
- Vista previa de los cambios
- Selección de fuentes
- Sistema de CSS variables para aplicar los temas dinámicamente en el frontend público

## 4. Resultado esperado

### Settings page (`/dashboard/settings`)

Nueva sección "Personalización Visual del Portal" debajo de "Identidad del Establecimiento" que incluya:

1. **Selector de Presets** — 6 círculos de color que al hacer clic aplican un preset completo
2. **Pickers de color manuales** — inputs `<input type="color">` para primary, secondary, background
3. **Selector de fuentes** — dropdown con 3 pares de fuentes
4. **Upload de logo** — drag & drop / file input con preview
5. **Upload de banner** — drag & drop / file input con preview
6. **Vista previa en vivo** — una card que muestra botón, badge, card de ejemplo con los colores actuales
7. **Botón "Restablecer valores predeterminados"**

### Booking portal (`/book/[slug]`)

El layout público debe:
- Leer las prefs de tema desde `getPropertyBySlug()`
- Inyectar CSS variables en un wrapper `<div>` con `style={{...}}` o mediante un `<style>` tag
- Cargar dinámicamente las Google Fonts seleccionadas via `next/font/google`
- Mostrar el logo y banner si están configurados

## 5. Restricciones y supuestos

- **Suposición**: Las prefs de Appwrite están accesibles tanto desde server actions (dashboard) como desde admin client (público).
- **Restricción**: No agregar dependencias npm nuevas. Usar `<input type="color">` nativo.
- **Restricción**: Las google fonts se cargan condicionalmente. Solo 3 pares definidos.
- **Restricción**: Los archivos de logo/banner se suben a Appwrite Storage (ya implementado en `property.ts`).
- **Suposición**: `getPropertyBySlug()` puede devolver las nuevas prefs sin cambios en la paginación.
- **Restricción**: El booking layout es Server Component — la inyección de CSS variables debe hacerse en servidor.
- **Suposición**: El CSP en `next.config.ts` permite `img-src` desde Appwrite cloud y `font-src` incluye `fonts.gstatic.com` y `fonts.googleapis.com`.

## 6. Dirección visual

La UI de personalización debe sentirse **premium, hostelera y cuidada**, no como un panel de WordPress genérico:

- **Tono**: Refinado, táctil, con énfasis en previews visuales. Swatches de color con sombras y bordes sutiles. Los inputs `<input type="color">` deben verse integrados (con un label visual al lado).
- **Layout**: La sección nueva va en una Card separada. Los presets van en fila. Los pickers manuales en dos columnas en desktop. La preview ocupa el ancho completo.
- **La preview** debe ser recognoscible: un botón "Reservar ahora", un badge "Disponible", una card "Habitación Deluxe" con un rectángulo gris simulando imagen, todo con los colores reales.
- **Colores de la UI de settings**: Usar la paleta "Tropical Modernist" que terracotta como primary, teal como secondary, fondo off-white.
- **Micro-interacción**: Los presets tienen un check animado cuando están seleccionados. Hover sutil con escala.

## 7. Skills y referencias a usar

| Skill | Propósito |
|-------|-----------|
| `frontend-design` | Diseño visual de la UI de personalización: swatches, preview, composición |
| `next-best-practices` | Carga dinámica de Google Fonts con `next/font/google`, patrones RSC |
| `vercel-react-best-practices` | Optimización de re-renders en la preview en vivo |
| `tailwind-css-patterns` | Clases utilitarias para layout responsive, grid, spacing |
| `zod` (opcional) | Validación de hex colors en server action |

## 8. Arquitectura de implementación

### Flujo de datos

```
Dashboard (Client Component)
  │
  ├── user.prefs (themePrimary, themeSecondary, ...)
  │     └── useAppContext().user
  │
  ├── updatePropertySettings({ ...themeFields })
  │     └── Server Action → Appwrite account.updatePrefs()
  │
  └── uploadPropertyImage(formData, type)
        └── Server Action → Appwrite storage.createFile() + account.updatePrefs()

Booking Portal (Server Component)
  │
  ├── getPropertyBySlug(slug)
  │     └── Admin Client → users.list() → match prefs
  │
  ├── property.themePrimary, property.themeSecondary, etc.
  │
  └── <div style={{ '--theme-primary': '...' }}>
        ├── next/font/google (dynamic)
        └── children
```

### Pref keys nuevas

| Key | Tipo | Default | Descripción |
|-----|------|---------|-------------|
| `themePreset` | `string` | `"tropical"` | ID del preset activo |
| `themePrimary` | `string` (hex) | `"#C96A4F"` | Color primario |
| `themeSecondary` | `string` (hex) | `"#367A6E"` | Color secundario |
| `themeBackground` | `string` (hex) | `"#F7F4EF"` | Tono de fondo |
| `themeFontHeading` | `string` | `"Sora"` | Fuente para headings |
| `themeFontBody` | `string` | `"DM Sans"` | Fuente para body |

### CSS variables para el booking portal

```css
--theme-primary: #C96A4F;
--theme-primary-foreground: #FFFFFF;
--theme-primary-hover: #B55A3F;        /* darken 10% */
--theme-primary-muted: rgba(201,106,79,0.1);
--theme-secondary: #367A6E;
--theme-secondary-foreground: #FFFFFF;
--theme-secondary-light: #4A9A8C;       /* lighten */
--theme-background: #F7F4EF;
--theme-font-heading: 'Sora', sans-serif;
--theme-font-body: 'DM Sans', sans-serif;
```

### Presets de color

| Preset | Primary | Secondary | Background | Descripción visual |
|--------|---------|-----------|------------|-------------------|
| `tropical` | `#C96A4F` | `#367A6E` | `#F7F4EF` | Terracotta + Teal (default) |
| `ocean` | `#1A5F7A` | `#7BC4C4` | `#F0F7FA` | Azul profundo + Aqua |
| `forest` | `#3A7A4F` | `#D4A853` | `#F4F7F0` | Verde bosque + Ámbar |
| `sunset` | `#D4734E` | `#7B5EA7` | `#FFF5F0` | Naranja cálido + Púrpura |
| `monochrome` | `#2D2D2D` | `#6B6B6B` | `#FAFAFA` | Negro + Gris |
| `boutique` | `#7A2E4A` | `#C4A44A` | `#FFF8F5` | Borgoña + Oro |

## 9. Cambios por archivo

### 9.1 `lib/definitions.ts`

**Extender `PropertySettings` y `User` type:**

```typescript
// En User type, agregar:
export type User = {
  // ...existing fields...
  
  // Theme / Branding settings
  themePreset?: string;
  themePrimary?: string;
  themeSecondary?: string;
  themeBackground?: string;
  themeFontHeading?: string;
  themeFontBody?: string;
}
```

### 9.2 `lib/actions/property.ts`

**Extender `PropertySettings` interface:**

```typescript
export interface PropertySettings {
    hotelName?: string;
    propertySlug?: string;
    currencySymbol?: string;
    // New theme fields
    themePreset?: string;
    themePrimary?: string;
    themeSecondary?: string;
    themeBackground?: string;
    themeFontHeading?: string;
    themeFontBody?: string;
}
```

**Extender `updatePropertySettings()`:**

```typescript
export async function updatePropertySettings(settings: PropertySettings) {
    // ...existing code...
    
    await account.updatePrefs({
        ...currentPrefs,
        hotelName: settings.hotelName?.trim() || currentPrefs.hotelName,
        propertySlug: slug || currentPrefs.propertySlug,
        currencySymbol: settings.currencySymbol || currentPrefs.currencySymbol || '$',
        // New theme fields
        themePreset: settings.themePreset || currentPrefs.themePreset || 'tropical',
        themePrimary: settings.themePrimary || currentPrefs.themePrimary || '#C96A4F',
        themeSecondary: settings.themeSecondary || currentPrefs.themeSecondary || '#367A6E',
        themeBackground: settings.themeBackground || currentPrefs.themeBackground || '#F7F4EF',
        themeFontHeading: settings.themeFontHeading || currentPrefs.themeFontHeading || 'Sora',
        themeFontBody: settings.themeFontBody || currentPrefs.themeFontBody || 'DM Sans',
    });
}
```

**Extender `getPropertyBySlug()` return value:**

```typescript
return {
    success: true,
    property: {
        userId: match.$id,
        hotelName: prefs.hotelName || match.name,
        propertySlug: prefs.propertySlug,
        hotelLogoId: prefs.hotelLogoId || null,
        hotelBannerId: prefs.hotelBannerId || null,
        currencySymbol: prefs.currencySymbol || '$',
        // New theme fields
        themePreset: prefs.themePreset || 'tropical',
        themePrimary: prefs.themePrimary || '#C96A4F',
        themeSecondary: prefs.themeSecondary || '#367A6E',
        themeBackground: prefs.themeBackground || '#F7F4EF',
        themeFontHeading: prefs.themeFontHeading || 'Sora',
        themeFontBody: prefs.themeFontBody || 'DM Sans',
    },
    error: null
};
```

### 9.3 `lib/actions/auth.ts`

**Extender `getLoggedInUser()` para leer las nuevas prefs:**

```typescript
const portalPrefs = user.prefs as {
    // ...existing...
    themePreset?: string;
    themePrimary?: string;
    themeSecondary?: string;
    themeBackground?: string;
    themeFontHeading?: string;
    themeFontBody?: string;
};

const UserMapped: User = {
    // ...existing...
    themePreset: portalPrefs?.themePreset || 'tropical',
    themePrimary: portalPrefs?.themePrimary || '#C96A4F',
    themeSecondary: portalPrefs?.themeSecondary || '#367A6E',
    themeBackground: portalPrefs?.themeBackground || '#F7F4EF',
    themeFontHeading: portalPrefs?.themeFontHeading || 'Sora',
    themeFontBody: portalPrefs?.themeFontBody || 'DM Sans',
}
```

### 9.4 `app/[locale]/dashboard/settings/page.tsx` (cambios principales)

Agregar al estado local:
```typescript
// Theme state
const [themePreset, setThemePreset] = useState(user?.themePreset || 'tropical');
const [themePrimary, setThemePrimary] = useState(user?.themePrimary || '#C96A4F');
const [themeSecondary, setThemeSecondary] = useState(user?.themeSecondary || '#367A6E');
const [themeBackground, setThemeBackground] = useState(user?.themeBackground || '#F7F4EF');
const [themeFontHeading, setThemeFontHeading] = useState(user?.themeFontHeading || 'Sora');
const [themeFontBody, setThemeFontBody] = useState(user?.themeFontBody || 'DM Sans');
```

**Nuevos componentes a crear inline o importar:**

1. `ThemePresetSelector` — Fila de círculos de color para los 6 presets
2. `ColorPickerField` — Input `type="color"` con label y hex display
3. `FontSelector` — Dropdown para heading + body fonts
4. `ImageUploadField` — Drag & drop zone con preview de logo/banner
5. `ThemePreview` — Card de vista previa en vivo

**Handle de preset:**

```typescript
const PRESETS = {
  tropical:   { primary: '#C96A4F', secondary: '#367A6E', background: '#F7F4EF' },
  ocean:      { primary: '#1A5F7A', secondary: '#7BC4C4', background: '#F0F7FA' },
  forest:     { primary: '#3A7A4F', secondary: '#D4A853', background: '#F4F7F0' },
  sunset:     { primary: '#D4734E', secondary: '#7B5EA7', background: '#FFF5F0' },
  monochrome: { primary: '#2D2D2D', secondary: '#6B6B6B', background: '#FAFAFA' },
  boutique:   { primary: '#7A2E4A', secondary: '#C4A44A', background: '#FFF8F5' },
};

const applyPreset = (presetId: string) => {
  const p = PRESETS[presetId as keyof typeof PRESETS];
  setThemePreset(presetId);
  setThemePrimary(p.primary);
  setThemeSecondary(p.secondary);
  setThemeBackground(p.background);
};
```

**Upload de imágenes:**

Reutilizar `uploadPropertyImage` y `deletePropertyImage` ya existentes. Agregar estado local para `logoPreview` y `bannerPreview` con URLs de objeto temporales.

**Save handler extendido:**

```typescript
const result = await updatePropertySettings({
  hotelName, propertySlug, currencySymbol,
  themePreset, themePrimary, themeSecondary, themeBackground,
  themeFontHeading, themeFontBody,
});
```

### 9.5 `app/[locale]/book/[slug]/layout.tsx` (para aplicar el tema)

**Archivo nuevo o modificación del existente:**

Se requiere cambiar la estrategia actual. El layout es Server Component. Para inyectar CSS variables, podemos:

1. Obtener `property` con `getPropertyBySlug()`
2. Pasar las props de tema a un **nuevo componente cliente wrapper** que inyecte las variables y cargue las fuentes

**Estructura propuesta:**

```
app/[locale]/book/[slug]/layout.tsx           // Server Component (exists)
  └── components/book/booking-theme-provider.tsx  // Client Component (nuevo)
        ├── Carga dinámica de Google Font con next/font/google
        └── <div style={cssVariables}>{children}</div>
```

O, más simple (evitando un componente cliente extra):

**Opción A — Inline style en el Server Component (no necesita cliente):**

```tsx
export default async function BookingLayout({ children, params }) {
    const { property } = await getPropertyBySlug(resolvedParams.slug);
    if (!property) notFound();

    const cssVars = {
        '--theme-primary': property.themePrimary,
        '--theme-primary-foreground': '#FFFFFF',
        '--theme-secondary': property.themeSecondary,
        '--theme-secondary-foreground': '#FFFFFF',
        '--theme-background': property.themeBackground,
    } as React.CSSProperties;

    return (
        <div style={cssVars} className="min-h-screen" style={{ backgroundColor: 'var(--theme-background)' }}>
            {/* Header + children + footer */}
        </div>
    );
}
```

Pero **las fuentes requieren un Client Component** porque `next/font/google` no se puede usar condicionalmente en un Server Component de forma dinámica (las llamadas a Google Font son estáticas). 

**Opción B — componente ThemeProvider cliente:**

```tsx
// components/book/booking-theme-provider.tsx
'use client';

import { Sora, DM_Sans, Playfair_Display, Lato, Plus_Jakarta_Sans, Inter } from 'next/font/google';

const fontMap = {
    'Sora': { heading: Sora({ subsets: ['latin'], weight: ['400', '600', '700'] }), body: DM_Sans({ subsets: ['latin'], weight: ['400', '500'] }) },
    // ... otros pares
};

export function BookingThemeProvider({ theme, children }: { theme: any; children: React.ReactNode }) {
    // Aplicar CSS variables
    // Aplicar fuentes condicionalmente
    return <div style={cssVars}>{children}</div>;
}
```

**Decisión**: Usar **Server Component con style inline para colores** + **un Client Component minimalista solo para cargar las fuentes**.

### 9.6 `components/book/theme-settings-client.tsx` (nuevo)

Componente cliente ligero que:
- Recibe `theme` props desde el layout servidor
- Usa `next/font/google` para cargar las font pairings condicionalmente
- Renderiza un div contenedor con las clases de fuente
- Inyecta un `<style>` tag con los CSS custom properties (opcional, también pueden ir inline)

```tsx
'use client';

import { Sora, DM_Sans, Playfair_Display, Lato, Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { useMemo } from 'react';

const sora = Sora({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', variable: '--font-heading' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', variable: '--font-body' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', variable: '--font-heading' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], display: 'swap', variable: '--font-body' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', variable: '--font-body' });

const fontConfigs: Record<string, { heading: any; body: any }> = {
    'Sora': { heading: sora, body: dmSans },
    'Playfair Display': { heading: playfair, body: lato },
    'Plus Jakarta Sans': { heading: jakarta, body: inter },
};

export function ThemeProvider({
    theme,
    children,
}: {
    theme: { themePrimary: string; themeSecondary: string; themeBackground: string; themeFontHeading: string; themeFontBody: string };
    children: React.ReactNode;
}) {
    const fontPair = fontConfigs[theme.themeFontHeading] || fontConfigs['Sora'];
    const headingFont = fontPair.heading;
    const bodyFont = fontPair.body;

    const cssVars = useMemo(() => ({
        '--theme-primary': theme.themePrimary,
        '--theme-primary-foreground': getContrastColor(theme.themePrimary),
        '--theme-primary-hover': darken(theme.themePrimary, 10),
        '--theme-primary-muted': hexToRgba(theme.themePrimary, 0.1),
        '--theme-secondary': theme.themeSecondary,
        '--theme-secondary-foreground': getContrastColor(theme.themeSecondary),
        '--theme-secondary-light': lighten(theme.themeSecondary, 20),
        '--theme-background': theme.themeBackground,
    } as React.CSSProperties), [theme]);

    return (
        <div
            style={cssVars}
            className={`${headingFont.variable} ${bodyFont.variable} [font-family:var(--theme-font-body)]`}
        >
            {children}
        </div>
    );
}
```

**Funciones helper de color** (en `lib/color-utils.ts`):

```typescript
export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function darken(hex: string, percent: number): string {
    // ... reduce each channel by percent%
}

export function lighten(hex: string, percent: number): string {
    // ... increase each channel by percent%
}

export function getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1A1A1A' : '#FFFFFF';
}
```

## 10. Componentes y contratos

### Componentes nuevos en `components/book/`

| Componente | Props | Descripción |
|------------|-------|-------------|
| `BookingThemeProvider` | `theme: ThemeConfig, children` | Client component que inyecta CSS vars y carga fonts |
| `ThemeConfig` (type) | `themePrimary, themeSecondary, themeBackground, themeFontHeading, themeFontBody` | Interface de configuración de tema |

### Componentes nuevos en `app/[locale]/dashboard/settings/` (inline o separados)

| Componente/Render | Props/State | Descripción |
|-------------------|-------------|-------------|
| `ThemePresetSelector` | `presets, selected, onSelect` | Grid de 6 círculos de color |
| `ColorPickerField` | `label, value, onChange` | Label + input color + hex text |
| `FontSelector` | `fontHeading, fontBody, onChange` | Dropdown de pares de fuentes |
| `ImageUploadField` | `type, currentFileId, onUpload, onDelete` | Drag zone + preview |
| `ThemePreview` | `primary, secondary, background` | Card preview en vivo |

## 11. Estados y comportamiento

### Estados de la UI de settings

| Estado | Comportamiento |
|--------|---------------|
| **Loading** | `LoadingState` existente mientras carga user prefs |
| **Preset idle** | Círculo del preset activo tiene borde + check |
| **Preset hover** | Escala 1.05, sombra suave |
| **Preset selected** | Borde 3px primary + ícono check animado |
| **Color picker change** | Actualización inmediata del state local + preview |
| **Upload idle** | Área punteada con icono de upload |
| **Upload dragging** | Borde primary + bg primary/5 |
| **Upload preview** | Imagen en miniatura con botón X para eliminar |
| **Upload uploading** | Spinner + "Subiendo..." |
| **Upload success** | Toast verde + preview actualizada |
| **Upload error** | Toast rojo con mensaje |
| **Save idle** | Botón "Guardar Cambios" |
| **Save saving** | "Guardando..." + disabled |
| **Save success** | Toast + `updateUser()` + refresh |
| **Save error** | Toast destructivo |
| **Reset** | Confirm dialog? → aplicar defaults del preset "tropical" |
| **Preview en vivo** | Se actualiza en cada cambio de color/fuente (optimizado) |

### Estados del booking portal

| Estado | Comportamiento |
|--------|---------------|
| **Tema cargado** | CSS variables aplicadas en el wrapper |
| **Font cargada** | Google Font cargada vía next/font, clases CSS aplicadas |
| **Font fallback** | Si la font no carga, fallback a sans-serif system |
| **Logo presente** | Renderizar `<Image>` con URL de Appwrite Storage |
| **Logo ausente** | Mostrar initial del hotel name en un círculo |
| **Banner presente** | Renderizar como hero image con overlays |
| **Banner ausente** | Mostrar gradiente base |

## 12. Responsive

### Settings page — Layout de personalización

```tsx
// Desktop (≥1024px)
<div className="grid grid-cols-2 gap-6">
  <ColorPickerField />  <ColorPickerField />
  <ImageUploadField />  <FontSelector />
</div>
<ThemePreview className="col-span-full" />

// Mobile (<640px)
// Single column stack
<div className="space-y-4">
  <ColorPickerField />
  <ColorPickerField />  
  <ImageUploadField />
  <FontSelector />
</div>
<ThemePreview />
```

**Breakpoints**:
- `sm:grid-cols-2` para pickers de color en tablet
- `md:grid-cols-3` para presets (2 filas de 3) en desktop
- Los swatches de preset deben ser tocables (min 44×44px)

### Booking portal

- CSS variables se aplican globalmente
- Logo: `max-w-[200px] h-auto` en desktop, `max-w-[140px]` en mobile
- Banner: height `300px` desktop, `180px` mobile con `object-cover`

## 13. Accesibilidad

- Color pickers tienen labels asociados (`htmlFor`)
- Swatches de preset: `role="radio"`, `aria-checked`, `aria-label="Tema Tropical"`
- Los `<input type="color">` nativos ya son accesibles por defecto
- **Contraste**: 
  - `getContrastColor()` asegura que `--theme-primary-foreground` sea blanco o negro según luminosidad
  - Los botones en preview deben mostrar contraste suficiente
- Upload: `role="button"`, `tabIndex={0}`, soporte de teclado (Enter para seleccionar archivo)
- Las notificaciones toast deben ser role="alert"
- Preview: usar `aria-live="polite"` para anunciar cambios de tema
- Font selector: dropdown nativo accesible

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| **Google Fonts no cargan por CSP** | Actualizar `font-src` en `next.config.ts` para incluir `https://fonts.gstatic.com https://fonts.googleapis.com` |
| **Carga de 4+ weights de Google Fonts impacta performance** | Limitar weights estrictamente: heading 400,600,700; body 400,500. Usar `display: 'swap'` |
| **Colores inválidos en prefs** | Validar formato hex en server action y en cliente antes de guardar |
| **Logo/banner de gran tamaño** | El server action ya limita a 5MB. Agregar validación de dimensiones (máx 2000px) |
| **Overflow de preview en mobile** | Preview card usa `w-full overflow-hidden` y escala contenido |
| **Re-renders excesivos en preview** | Usar `useMemo` para CSS vars derivadas, memoizar componentes de preview |
| **Booking layout con muchas fonts** | Solo 3 pares. La font elegida se carga una vez y se cachea |
| **Preset cambia colores custom** | Al seleccionar preset, se sobreescriben los pickers. Si el usuario luego toca un picker, `themePreset` pasa a `"custom"` |

## 15. Orden de ejecución

### Fase 1 — Base de datos y server actions

1. **Extender tipos** en `lib/definitions.ts` (User type con theme fields)
2. **Extender `PropertySettings`** y `updatePropertySettings()` en `lib/actions/property.ts`
3. **Extender `getPropertyBySlug()`** para devolver theme fields
4. **Extender `getLoggedInUser()`** en `lib/actions/auth.ts` para mapear theme fields
5. **Crear `lib/color-utils.ts`** con helpers hexToRgba, darken, lighten, getContrastColor

### Fase 2 — Componentes de booking portal

6. **Crear `components/book/booking-theme-provider.tsx`** — Client component que inyecta CSS vars y carga Google Fonts
7. **Modificar `app/[locale]/book/[slug]/layout.tsx`** — Pasar theme props al provider, integrar logo y banner
8. **Modificar `app/[locale]/book/[slug]/page.tsx`** — Usar `var(--theme-primary)` en lugar de colores fijos (clases Tailwind con variables CSS)

### Fase 3 — UI de Settings

9. **Crear componente `ThemePresetSelector`** — Swatches de colores preseleccionados
10. **Crear componente `ColorPickerField`** — Input nativo + label + hex value
11. **Crear componente `FontSelector`** — Dropdown de pares tipográficos
12. **Crear componente `ImageUploadField`** — Upload con drag & drop y preview
13. **Crear componente `ThemePreview`** — Vista previa en vivo
14. **Integrar todo en `settings/page.tsx`** — Agregar sección, estados, handler de save
15. **Agregar botón "Restablecer valores predeterminados"**

### Fase 4 — Ajustes y validación

16. **Actualizar CSP** en `next.config.ts` para incluir Google Fonts
17. **Validación de contraste** — Asegurar que todos los colores custom cumplan WCAG AA en botones
18. **Build y pruebas** — `pnpm build` para detectar errores de tipo
19. **Validación en chrome-devtools** — Responsive, accesibilidad, performance

## 16. Validación en navegador

Usar `chrome-devtools` para validar:

1. **Layout responsive** (375px, 768px, 1280px):
   - Swatches de preset se envuelven correctamente
   - Pickers de color en columna en mobile
   - Preview no se desborda

2. **Preview en vivo**:
   - Cambiar preset → preview se actualiza inmediatamente
   - Cambiar color picker → preview refleja cambio
   - Cambiar fuente → preview muestra la fuente correcta

3. **Upload de imágenes**:
   - Logo se sube y se muestra preview
   - Banner se sube y se muestra preview
   - Eliminar funciona

4. **Booking portal**:
   - CSS variables se aplican correctamente (inspeccionar estilos computados)
   - Colores de botones, badges, backgrounds coinciden con settings
   - Fuente cargada correctamente
   - Logo y banner visibles

5. **Accesibilidad**:
   - Lighthouse audit (accesibilidad ≥ 90)
   - Navegación por teclado en swatches y uploads
   - Contraste suficiente en botones con colores personalizados

6. **Performance**:
   - Google Fonts cargadas con `display: swap` (sin CLS)
   - Imágenes de logo/banner optimizadas (next/image)

## 17. Criterios de aceptación

- [ ] **Settings page** tiene sección "Personalización Visual del Portal" con todos los controles
- [ ] **6 presets visuales** funcionan con un clic y actualizan todos los campos
- [ ] **Color pickers manuales** para primary, secondary, background
- [ ] **Selector de fuentes** con 3 pares tipográficos
- [ ] **Upload de logo** con drag & drop, preview, y eliminación
- [ ] **Upload de banner** con drag & drop, preview, y eliminación
- [ ] **Preview en vivo** se actualiza en tiempo real sin demora perceptible
- [ ] **Botón de reset** restaura los valores "tropical" predeterminados
- [ ] **Booking portal** refleja los colores personalizados (botones, badges, fondo)
- [ ] **Booking portal** carga la fuente seleccionada dinámicamente
- [ ] **Logo** se muestra en el header del portal
- [ ] **Banner** se muestra como hero image (opcional para MVP si no se usa aún)
- [ ] **Contraste** suficiente en botones: texto en primary-foreground siempre legible
- [ ] **Responsive**: settings se ve bien en mobile y desktop
- [ ] **Sin errores de tipos** en `pnpm build`
- [ ] **Sin errores de lint** en `pnpm lint`
- [ ] **Lighthouse accesibilidad** ≥ 90 en settings page
- [ ] **CSP actualizado** para permitir Google Fonts

---

## Apéndice A — Detalle de cambios por archivo

### `lib/color-utils.ts` (nuevo)

```typescript
export function hexToRgba(hex: string, alpha: number): string;
export function darken(hex: string, percent: number): string;
export function lighten(hex: string, percent: number): string;
export function getContrastColor(hex: string): '#FFFFFF' | '#1A1A1A';
export function isValidHex(hex: string): boolean;
export function hexToHsl(hex: string): { h: number; s: number; l: number };
```

### `components/book/booking-theme-provider.tsx` (nuevo)

- Client Component
- Importa 6 font families de `next/font/google` (Sora, DM Sans, Playfair Display, Lato, Plus Jakarta Sans, Inter)
- Mapa `fontMap` de heading → body
- Computa CSS vars con `useMemo` (todo: primary hover, primary muted, secondary light, contrast colors)
- Renderiza `<div>` contenedor con `style={cssVars}` y clases de fuente `{fontHeading.variable} {fontBody.variable}`

### `app/[locale]/book/[slug]/layout.tsx`

- Obtener `property` con `getPropertyBySlug()`
- Extraer theme fields con defaults
- Envolver children en `<ThemeProvider theme={themeConfig}>`
- Renderizar logo en header si `hotelLogoId` existe (usando `<Image>` con URL de Appwrite y `next.config` remotePatterns)
- Renderizar banner como hero section condicionalmente

### `app/[locale]/dashboard/settings/page.tsx`

**Nuevo estado:**
```typescript
const [themePreset, setThemePreset] = useState(user?.themePreset || 'tropical');
const [themePrimary, setThemePrimary] = useState(user?.themePrimary || '#C96A4F');
const [themeSecondary, setThemeSecondary] = useState(user?.themeSecondary || '#367A6E');
const [themeBackground, setThemeBackground] = useState(user?.themeBackground || '#F7F4EF');
const [themeFontHeading, setThemeFontHeading] = useState(user?.themeFontHeading || 'Sora');
const [themeFontBody, setThemeFontBody] = useState(user?.themeFontBody || 'DM Sans');
const [uploadingLogo, setUploadingLogo] = useState(false);
const [uploadingBanner, setUploadingBanner] = useState(false);
```

**Nuevo handler de preset:**
```typescript
const PRESETS = { ... };

const handlePresetSelect = (id: string) => {
    const p = PRESETS[id as keyof typeof PRESETS];
    setThemePreset(id);
    setThemePrimary(p.primary);
    setThemeSecondary(p.secondary);
    setThemeBackground(p.background);
};
```

**Nuevo handler de reset:**
```typescript
const handleResetTheme = () => {
    handlePresetSelect('tropical');
    setThemeFontHeading('Sora');
    setThemeFontBody('DM Sans');
};
```

**Save handler extendido:**
```typescript
const handleSaveSettings = async () => {
    // ...validaciones existentes...
    const result = await updatePropertySettings({
        hotelName, propertySlug, currencySymbol,
        themePreset, themePrimary, themeSecondary, themeBackground,
        themeFontHeading, themeFontBody,
    });
};
```

**Upload handlers:**
```typescript
const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadPropertyImage(formData, 'logo');
    setUploadingLogo(false);
    if (result.success) {
        await updateUser();
        toast({ title: "Logo actualizado" });
    }
};
```

## Apéndice B — Colores de preset específicos

| Preset | Nombre | Primary | Secondary | Background | Mood |
|--------|--------|---------|-----------|------------|------|
| `tropical` | Tropical | `#C96A4F` | `#367A6E` | `#F7F4EF` | Cálido, natural, acogedor |
| `ocean` | Océano | `#1A5F7A` | `#7BC4C4` | `#F0F7FA` | Fresco, sereno, costero |
| `forest` | Bosque | `#3A7A4F` | `#D4A853` | `#F4F7F0` | Natural, orgánico, terroso |
| `sunset` | Atardecer | `#D4734E` | `#7B5EA7` | `#FFF5F0` | Vibrante, dramático, cálido |
| `monochrome` | Monocromo | `#2D2D2D` | `#6B6B6B` | `#FAFAFA` | Elegante, minimalista, limpio |
| `boutique` | Boutique | `#7A2E4A` | `#C4A44A` | `#FFF8F5` | Lujoso, sofisticado, íntimo |

## Apéndice C — Font pairings

| Heading Font | Body Font | Estilo | Best for |
|-------------|-----------|--------|----------|
| `Sora` (400,600,700) | `DM Sans` (400,500) | Geométrico moderno | Default, cualquier tipo |
| `Playfair Display` (400,600,700) | `Lato` (400,700) | Editorial elegante | Hoteles boutique, resorts |
| `Plus Jakarta Sans` (400,600,700) | `Inter` (400,500) | Clean corporativo | Hostels modernos, urbanos |

## Apéndice D — CSP update

En `next.config.ts`, la directiva `font-src` debe actualizarse para permitir Google Fonts:

```typescript
"font-src 'self' data: https://fonts.gstatic.com",
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
```

(La directiva `style-src` ya permite `'unsafe-inline'`, solo falta agregar `https://fonts.googleapis.com`)

## Apéndice E — Booking portal layout modificado

```tsx
// app/[locale]/book/[slug]/layout.tsx
import { getPropertyBySlug } from "@/lib/actions/property";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/book/booking-theme-provider";
import Image from "next/image";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const BUCKET_ID = process.env.NEXT_APPWRITE_BUCKET_ID;

function getImageUrl(fileId: string): string {
    return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT}`;
}

export default async function BookingLayout({ children, params }) {
    const resolvedParams = await params;
    const { property } = await getPropertyBySlug(resolvedParams.slug);
    if (!property) notFound();

    const theme = {
        themePrimary: property.themePrimary,
        themeSecondary: property.themeSecondary,
        themeBackground: property.themeBackground,
        themeFontHeading: property.themeFontHeading,
        themeFontBody: property.themeFontBody,
    };

    return (
        <ThemeProvider theme={theme}>
            <div className="min-h-screen" style={{ backgroundColor: 'var(--theme-background)' }}>
                <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
                        <div className="flex items-center gap-3">
                            {property.hotelLogoId ? (
                                <Image
                                    src={getImageUrl(property.hotelLogoId)}
                                    alt={property.hotelName}
                                    width={120}
                                    height={40}
                                    className="h-8 w-auto object-contain"
                                    priority
                                />
                            ) : (
                                <span className="font-bold text-lg tracking-tight"
                                      style={{ color: 'var(--theme-primary)' }}>
                                    {property.hotelName}
                                </span>
                            )}
                        </div>
                        {/* ... */}
                    </div>
                </header>
                <main className="container mx-auto px-4 py-8 max-w-5xl">
                    {children}
                </main>
                <footer className="border-t mt-16 py-6 text-center"
                        style={{ backgroundColor: 'var(--theme-background)' }}>
                    <p className="text-xs text-muted-foreground">
                        Motor de reservas · Powered by{" "}
                        <span style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>SART</span>
                    </p>
                </footer>
            </div>
        </ThemeProvider>
    );
}
```

## Apéndice F — Booking portal page (uso de CSS variables)

En `app/[locale]/book/[slug]/page.tsx`, reemplazar colores fijos:

| Actual | Reemplazar con |
|--------|---------------|
| `border-primary` | `border-[var(--theme-primary)]` |
| `bg-primary/10` | `bg-[var(--theme-primary-muted)]` |
| `text-primary` | `text-[var(--theme-primary)]` |
| `hover:border-primary` | `hover:border-[var(--theme-primary)]` |
| `bg-white` (cards) | `bg-white` (mantener) |
| `text-slate-900` | mantener (para headings) |
| `text-slate-800` | mantener |
| `border-slate-200` | `border-gray-200` (neutro) |

**Alternativa más limpia**: Definir clases CSS utilitarias en `globals.css` que usen las variables:

```css
@layer components {
  .btn-primary-theme {
    background-color: var(--theme-primary);
    color: var(--theme-primary-foreground);
  }
  .btn-primary-theme:hover {
    background-color: var(--theme-primary-hover);
  }
  .badge-secondary-theme {
    background-color: var(--theme-secondary);
    color: var(--theme-secondary-foreground);
  }
  .bg-theme-muted {
    background-color: var(--theme-primary-muted);
  }
}
```

Luego en los componentes del booking portal, usar estas clases utilitarias en lugar de las clases shadcn directas.

---

## Checklist de implementación

- [ ] Fase 1: Data layer (types, actions, auth)
- [ ] Fase 2: Booking theme provider + layout
- [ ] Fase 3: Settings UI (presets, pickers, uploads, preview)
- [ ] Fase 4: CSP, contraste, build, QA
- [ ] Validación chrome-devtools (responsive, a11y, lighthouse)
- [ ] Prueba de flujo completo: settings → guardar → ver portal público
