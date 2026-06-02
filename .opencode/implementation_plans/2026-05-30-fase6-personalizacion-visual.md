# Fase 6: Personalización Visual desde Settings — Plan Detallado

Fecha: 2026-05-30
Basado en: Plan Maestro v3.1 (`2026-05-27-booking-portal-unificado-completo.md`)

---

## Estado Pre-Fase (verificado en codebase)

| Ítem | Estado |
|------|--------|
| `lib/color-utils.ts` | ✅ Completo: hexToRgba, darken, lighten, getContrastColor, isValidHex, hexToHsl |
| `globals.css` `:root:has(.booking-theme)` | ✅ Default tropical |
| `components/book/booking-theme-provider.tsx` | ✅ Acepta `settings` prop, tiene hexToHslValue interno |
| Booking layout — 6 fuentes next/font | ✅ Sora, DM Sans, Playfair Display, Lato, Plus Jakarta Sans, Inter |
| i18n `Settings.theme.*` + `Settings.mercadopago.*` | ✅ Ya existen en es/en/pt |
| `lib/definitions.ts` — `PropertySettingsPublic` | ✅ Ya tiene theme fields + mp fields |
| `lib/actions/mercadopago-oauth.ts` | ✅ `getMpAuthUrl()` y `disconnectMp()` existen |
| `lib/actions/property.ts` — `uploadPropertyImage`, `deletePropertyImage` | ✅ Existen |

---

## Paso 1: Extender `User` type en `definitions.ts`

**Archivo**: `lib/definitions.ts`
**Línea**: ~84 (después de `currencySymbol`)

Agregar al type `User`:
```typescript
    themePreset?: string
    themePrimary?: string
    themeSecondary?: string
    themeBackground?: string
    themeFontHeading?: string
    themeFontBody?: string
    mp_access_token?: string
```

**Por qué**: `User` se usa en `AppContext` y en el Settings page. Sin estos campos TS se queja.

---

## Paso 2: Extender `getLoggedInUser()` en `auth.ts`

**Archivo**: `lib/actions/auth.ts`

**2a.** Extraer del `portalPrefs` (línea ~92):
```typescript
const portalPrefs = user.prefs as {
    customTrialEnd?: string;
    hotelName?: string;
    propertySlug?: string;
    hotelLogoId?: string;
    hotelBannerId?: string;
    currencySymbol?: string;
    themePreset?: string;
    themePrimary?: string;
    themeSecondary?: string;
    themeBackground?: string;
    themeFontHeading?: string;
    themeFontBody?: string;
    mp_access_token?: string;
};
```

**2b.** Mapear en `UserMapped` (después de línea ~119):
```typescript
themePreset: portalPrefs?.themePreset || 'tropical',
themePrimary: portalPrefs?.themePrimary || '#C96A4F',
themeSecondary: portalPrefs?.themeSecondary || '#367A6E',
themeBackground: portalPrefs?.themeBackground || '#F7F4EF',
themeFontHeading: portalPrefs?.themeFontHeading || 'Sora',
themeFontBody: portalPrefs?.themeFontBody || 'DM Sans',
mp_access_token: portalPrefs?.mp_access_token,
```

---

## Paso 3: Extender `updatePropertySettings()` en `property.ts`

**Archivo**: `lib/actions/property.ts`
**Línea**: ~26-31 (dentro de `account.updatePrefs()`)

```typescript
await account.updatePrefs({
    ...currentPrefs,
    hotelName: settings.hotelName?.trim() || currentPrefs.hotelName,
    propertySlug: slug || currentPrefs.propertySlug,
    currencySymbol: settings.currencySymbol || currentPrefs.currencySymbol || '$',
    themePreset: settings.themePreset || currentPrefs.themePreset || 'tropical',
    themePrimary: settings.themePrimary || currentPrefs.themePrimary || '#C96A4F',
    themeSecondary: settings.themeSecondary || currentPrefs.themeSecondary || '#367A6E',
    themeBackground: settings.themeBackground || currentPrefs.themeBackground || '#F7F4EF',
    themeFontHeading: settings.themeFontHeading || currentPrefs.themeFontHeading || 'Sora',
    themeFontBody: settings.themeFontBody || currentPrefs.themeFontBody || 'DM Sans',
});
```

---

## Paso 4: Extender `getPropertyBySlug()` en `property.ts`

**Archivo**: `lib/actions/property.ts`
**Línea**: ~166-174 (dentro del return del `match`)

```typescript
property: {
    userId: match.$id,
    hotelName: prefs.hotelName || match.name,
    propertySlug: prefs.propertySlug,
    hotelLogoId: prefs.hotelLogoId || null,
    hotelBannerId: prefs.hotelBannerId || null,
    currencySymbol: prefs.currencySymbol || '$',
    themePreset: prefs.themePreset || 'tropical',
    themePrimary: prefs.themePrimary || '#C96A4F',
    themeSecondary: prefs.themeSecondary || '#367A6E',
    themeBackground: prefs.themeBackground || '#F7F4EF',
    themeFontHeading: prefs.themeFontHeading || 'Sora',
    themeFontBody: prefs.themeFontBody || 'DM Sans',
},
```

---

## Paso 5: ThemePresetSelector — NUEVO

**Archivo**: `components/book/theme-preset-selector.tsx`

```typescript
"use client"

import { useId } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const PRESETS = {
  tropical:   { label: "Tropical",     primary: "#C96A4F", secondary: "#367A6E", background: "#F7F4EF", heading: "Sora",           body: "DM Sans" },
  ocean:      { label: "Océano",       primary: "#1A5F7A", secondary: "#7BC4C4", background: "#F0F7FA", heading: "Sora",           body: "DM Sans" },
  forest:     { label: "Bosque",       primary: "#3A7A4F", secondary: "#D4A853", background: "#F4F7F0", heading: "Sora",           body: "DM Sans" },
  sunset:     { label: "Atardecer",    primary: "#D4734E", secondary: "#7B5EA7", background: "#FFF5F0", heading: "Playfair Display", body: "Lato" },
  monochrome: { label: "Monocromo",    primary: "#2D2D2D", secondary: "#6B6B6B", background: "#FAFAFA", heading: "Plus Jakarta Sans", body: "Inter" },
  boutique:   { label: "Boutique",     primary: "#7A2E4A", secondary: "#C4A44A", background: "#FFF8F5", heading: "Playfair Display", body: "Lato" },
} as const

interface Props { selected: string; onChange: (presetId: string) => void }

export function ThemePresetSelector({ selected, onChange }: Props) {
  const labelId = useId()
  return (
    <div>
      <label id={labelId} className="text-sm font-medium mb-3 block">Presets de colores</label>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-labelledby={labelId}>
        {Object.entries(PRESETS).map(([id, preset]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected === id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div
              className="relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all"
              style={{
                backgroundColor: preset.background,
                borderColor: selected === id ? preset.primary : "transparent",
                boxShadow: selected === id ? `0 0 0 2px ${preset.primary}40` : undefined,
              }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: preset.primary }}
              />
              {selected === id && (
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: preset.primary }}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export { PRESETS }
```

---

## Paso 6: ColorPickerField — NUEVO

**Archivo**: `components/book/color-picker-field.tsx`

```typescript
"use client"

import { useState, useRef, useEffect } from "react"
import { isValidHex } from "@/lib/color-utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface Props { label: string; value: string; onChange: (hex: string) => void }

export function ColorPickerField({ label, value, onChange }: Props) {
  const [localHex, setLocalHex] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { setLocalHex(value) }, [value])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setLocalHex(raw)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (isValidHex(raw)) onChange(raw)
    }, 150)
  }

  return (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValidHex(value) ? value : "#000000"}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-input cursor-pointer bg-transparent p-0.5"
          aria-label={label}
        />
        <Input
          value={localHex}
          onChange={handleTextChange}
          className={`font-mono text-sm w-28 ${!isValidHex(localHex) && localHex.length > 0 ? "border-red-500" : ""}`}
          placeholder="#C96A4F"
          maxLength={7}
        />
      </div>
    </div>
  )
}
```

---

## Paso 7: FontSelector — NUEVO

**Archivo**: `components/book/font-selector.tsx`

```typescript
"use client"

import { useId } from "react"
import { Label } from "@/components/ui/label"

const FONT_PAIRS = [
  { id: "classic",   heading: "Sora",           body: "DM Sans",          headingLabel: "Sora",        bodyLabel: "DM Sans" },
  { id: "elegant",   heading: "Playfair Display", body: "Lato",          headingLabel: "Playfair Display", bodyLabel: "Lato" },
  { id: "modern",    heading: "Plus Jakarta Sans", body: "Inter",        headingLabel: "Plus Jakarta Sans", bodyLabel: "Inter" },
] as const

interface Props { headingValue: string; bodyValue: string; onChange: (heading: string, body: string) => void }

export function FontSelector({ headingValue, bodyValue, onChange }: Props) {
  const labelId = useId()
  return (
    <div className="space-y-2">
      <Label id={labelId} className="font-medium">Fuentes</Label>
      <div className="grid gap-2" role="radiogroup" aria-labelledby={labelId}>
        {FONT_PAIRS.map((pair) => {
          const selected = headingValue === pair.heading && bodyValue === pair.body
          return (
            <button
              key={pair.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(pair.heading, pair.body)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:bg-muted/50"
              }`}
            >
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: `var(--font-${pair.heading.toLowerCase().replace(/\s+/g, '-')})` }}>
                  {pair.heading}
                </p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: `var(--font-${pair.body.toLowerCase().replace(/\s+/g, '-')})` }}>
                  {pair.body} — The quick brown fox jumps over the lazy dog
                </p>
              </div>
              {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

Nota: El mapping de nombres a variables CSS:
- `Sora` → `var(--font-sora)`
- `DM Sans` → `var(--font-dm-sans)`
- `Playfair Display` → `var(--font-playfair)`
- `Lato` → `var(--font-lato)`
- `Plus Jakarta Sans` → `var(--font-plus-jakarta)`
- `Inter` → `var(--font-inter)`

---

## Paso 8: ImageUploadField — NUEVO

**Archivo**: `components/book/image-upload-field.tsx`

```typescript
"use client"

import { useState, useRef, useId } from "react"
import { Upload, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface Props {
  type: "logo" | "banner"
  currentFileId?: string
  onUpload: (formData: FormData) => Promise<{ success: boolean; fileId?: string | null; error?: string | null }>
  onDelete: () => Promise<{ success: boolean; error?: string | null }>
}

export function ImageUploadField({ type, currentFileId, onUpload, onDelete }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const hasImage = !!currentFileId || !!previewUrl

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    setLoading(true)
    const fd = new FormData()
    fd.append("file", file)
    const result = await onUpload(fd)
    setLoading(false)
    if (!result.success) {
      setPreviewUrl(null)
    }
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete()
    setPreviewUrl(null)
    setDeleting(false)
  }

  return (
    <div className="space-y-2">
      <Label className="font-medium">{type === "logo" ? "Logo del hotel" : "Banner del portal"}</Label>
      {hasImage ? (
        <div className="relative rounded-lg border overflow-hidden">
          {previewUrl || currentFileId ? (
            <div className={type === "logo" ? "p-4 flex items-center justify-center bg-muted/30" : "relative aspect-[3/1]"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID}/files/${currentFileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`}
                alt={type}
                className={type === "logo" ? "max-h-20 object-contain" : "w-full h-full object-cover"}
              />
            </div>
          ) : null}
          <div className="absolute top-2 right-2 flex gap-2">
            <Button size="sm" variant="secondary" asChild className="h-8 text-xs">
              <label htmlFor={`${id}-replace`} className="cursor-pointer">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reemplazar"}
              </label>
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting} className="h-8">
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={`${id}-upload`}
          className="flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Hacé clic para subir {type === "logo" ? "un logo" : "un banner"}</span>
              <span className="text-[10px] text-muted-foreground/60">PNG, JPG o WebP · Máx 5MB</span>
            </>
          )}
        </label>
      )}
      <input
        ref={inputRef}
        id={`${id}-${hasImage ? "replace" : "upload"}`}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
```

---

## Paso 9: ThemePreview — NUEVO

**Archivo**: `components/book/theme-preview.tsx`

```typescript
"use client"

import { getContrastColor } from "@/lib/color-utils"

interface Props {
  primary: string
  secondary: string
  background: string
  fontHeading: string
  fontBody: string
}

const FONT_STACKS: Record<string, string> = {
  "Sora": "var(--font-sora)",
  "DM Sans": "var(--font-dm-sans)",
  "Playfair Display": "var(--font-playfair)",
  "Lato": "var(--font-lato)",
  "Plus Jakarta Sans": "var(--font-plus-jakarta)",
  "Inter": "var(--font-inter)",
}

export function ThemePreview({ primary, secondary, background, fontHeading, fontBody }: Props) {
  const headingFont = FONT_STACKS[fontHeading] || "var(--font-sora)"
  const bodyFont = FONT_STACKS[fontBody] || "var(--font-dm-sans)"
  const primaryText = getContrastColor(primary)
  const bgText = getContrastColor(background)
  const secondaryText = getContrastColor(secondary)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Vista previa</p>
      <div
        className="rounded-xl overflow-hidden border shadow-sm"
        style={{ backgroundColor: background, color: bgText }}
      >
        {/* Header mock */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: primary }}>
          <span className="font-bold text-sm tracking-tight" style={{ color: primaryText }}>
            Mi Hotel
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${primaryText}20`, color: primaryText }}>
            Reservá ahora
          </span>
        </div>

        {/* Content mock */}
        <div className="p-4 space-y-3">
          <h3 style={{ fontFamily: headingFont, fontSize: "1.05rem", fontWeight: 700, color: bgText }}>
            Habitación Deluxe
          </h3>
          <p className="text-xs leading-relaxed" style={{ fontFamily: bodyFont, color: bgText }}>
        Habitación amplia con vista al mar, cama king-size y baño privado.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: secondary, color: secondaryText }}>
              Disponible
            </span>
            <span className="text-xs font-bold" style={{ color: bgText }}>
              $150 <span className="font-normal text-[10px]" style={{ color: bgText }}>/noche</span>
            </span>
          </div>
          <button
            className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary, color: primaryText }}
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Paso 10: Conectar BookingThemeProvider con datos guardados

**Archivo**: `app/[locale]/book/[slug]/layout.tsx`
**Línea**: ~70

Cambiar:
```tsx
<BookingThemeProvider>
```
a:
```tsx
<BookingThemeProvider
  settings={property ? {
    primary: property.themePrimary || '#C96A4F',
    secondary: property.themeSecondary || '#367A6E',
    background: property.themeBackground || '#F7F4EF',
    fontHeading: property.themeFontHeading || 'Sora',
    fontBody: property.themeFontBody || 'DM Sans',
  } : undefined}
>
```

---

## Paso 11: Settings — Card "Personalización Visual"

**Archivo**: `app/[locale]/dashboard/settings/page.tsx`

### Nuevos imports:
```typescript
import { ThemePresetSelector, PRESETS } from "@/components/book/theme-preset-selector"
import { ColorPickerField } from "@/components/book/color-picker-field"
import { FontSelector } from "@/components/book/font-selector"
import { ImageUploadField } from "@/components/book/image-upload-field"
import { ThemePreview } from "@/components/book/theme-preview"
import { uploadPropertyImage, deletePropertyImage } from "@/lib/actions/property"
```

### Nuevo estado (después de `const [currencySymbol, ...]`):
```typescript
const [themePreset, setThemePreset] = useState(user?.themePreset || "tropical")
const [themePrimary, setThemePrimary] = useState(user?.themePrimary || "#C96A4F")
const [themeSecondary, setThemeSecondary] = useState(user?.themeSecondary || "#367A6E")
const [themeBackground, setThemeBackground] = useState(user?.themeBackground || "#F7F4EF")
const [themeFontHeading, setThemeFontHeading] = useState(user?.themeFontHeading || "Sora")
const [themeFontBody, setThemeFontBody] = useState(user?.themeFontBody || "DM Sans")
```

### Nuevos handlers:
```typescript
const handlePresetSelect = (id: string) => {
  const p = PRESETS[id as keyof typeof PRESETS]
  setThemePreset(id)
  setThemePrimary(p.primary)
  setThemeSecondary(p.secondary)
  setThemeBackground(p.background)
  setThemeFontHeading(p.heading)
  setThemeFontBody(p.body)
}

const handleResetTheme = () => {
  handlePresetSelect("tropical")
}

const handleUploadLogo = async (formData: FormData) => {
  const result = await uploadPropertyImage(formData, "logo")
  if (result.success) await updateUser()
  return result
}
const handleDeleteLogo = async () => {
  const result = await deletePropertyImage("logo")
  if (result.success) await updateUser()
  return result
}
const handleUploadBanner = async (formData: FormData) => {
  const result = await uploadPropertyImage(formData, "banner")
  if (result.success) await updateUser()
  return result
}
const handleDeleteBanner = async () => {
  const result = await deletePropertyImage("banner")
  if (result.success) await updateUser()
  return result
}
```

### Extender `handleSaveSettings`:
```typescript
const result = await updatePropertySettings({
  hotelName, propertySlug, currencySymbol,
  themePreset, themePrimary, themeSecondary, themeBackground,
  themeFontHeading, themeFontBody,
})
```

### Nueva Card (después del Card "Identidad del Establecimiento"):
```tsx
<Card>
  <CardHeader>
    <CardTitle>Personalización Visual del Portal</CardTitle>
    <CardDescription>Personaliza los colores, fuentes e imágenes de tu portal de reservas público.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <ThemePresetSelector selected={themePreset} onChange={handlePresetSelect} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ColorPickerField label="Color primario" value={themePrimary} onChange={setThemePrimary} />
      <ColorPickerField label="Color secundario" value={themeSecondary} onChange={setThemeSecondary} />
      <ColorPickerField label="Color de fondo" value={themeBackground} onChange={setThemeBackground} />
      <FontSelector headingValue={themeFontHeading} bodyValue={themeFontBody} onChange={(h, b) => { setThemeFontHeading(h); setThemeFontBody(b) }} />
    </div>
    <ImageUploadField type="logo" currentFileId={user?.hotelLogoId} onUpload={handleUploadLogo} onDelete={handleDeleteLogo} />
    <ImageUploadField type="banner" currentFileId={user?.hotelBannerId} onUpload={handleUploadBanner} onDelete={handleDeleteBanner} />
    <ThemePreview primary={themePrimary} secondary={themeSecondary} background={themeBackground} fontHeading={themeFontHeading} fontBody={themeFontBody} />
    <Button onClick={handleResetTheme} variant="outline" className="w-full sm:w-auto">
      Restablecer valores predeterminados
    </Button>
  </CardContent>
</Card>
```

---

## Paso 12: Settings — Card "Conectar Mercado Pago"

**Archivo**: `app/[locale]/dashboard/settings/page.tsx`

### Nuevos imports:
```typescript
import { getMpAuthUrl, disconnectMp } from "@/lib/actions/mercadopago-oauth"
import { CheckCircle2, Unlink } from "lucide-react"
```

### Nuevos handlers:
```typescript
const [connectingMp, setConnectingMp] = useState(false)

const handleConnectMp = async () => {
  setConnectingMp(true)
  try {
    const url = await getMpAuthUrl(user.id)
    window.location.href = url
  } catch (error) {
    toast({ title: "Error", description: "No se pudo conectar con Mercado Pago", variant: "destructive" })
    setConnectingMp(false)
  }
}

const handleDisconnectMp = async () => {
  try {
    await disconnectMp(user.id)
    await updateUser()
    toast({ title: "Cuenta desconectada", description: "Mercado Pago ha sido desconectado." })
  } catch (error) {
    toast({ title: "Error", description: "No se pudo desconectar", variant: "destructive" })
  }
}
```

### Nueva Card (después de la Card de Personalización Visual):
```tsx
<Card>
  <CardHeader>
    <CardTitle>Conectar Mercado Pago</CardTitle>
    <CardDescription>Conectá tu cuenta de Mercado Pago para recibir pagos online de tus huéspedes.</CardDescription>
  </CardHeader>
  <CardContent>
    {user?.mp_access_token ? (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium text-green-700">Cuenta de Mercado Pago conectada</span>
        </div>
        <Button variant="destructive" onClick={handleDisconnectMp}>
          <Unlink className="h-4 w-4 mr-2" />
          Desconectar
        </Button>
      </div>
    ) : (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Conectá tu cuenta de Mercado Pago para que tus huéspedes puedan pagar la seña online al reservar.
          El dinero va directo a tu cuenta — SART no cobra comisión.
        </p>
        <Button onClick={handleConnectMp} disabled={connectingMp}>
          {connectingMp ? "Redirigiendo..." : "Conectar Mercado Pago"}
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

---

## Orden de Implementación

```
 1. definitions.ts        — +7 campos al type User
 2. auth.ts               — extraer + mapear theme + mp_access_token
 3. property.ts           — updatePropertySettings guarda theme fields
 4. property.ts           — getPropertyBySlug retorna theme fields
 5. theme-preset-selector — NUEVO
 6. color-picker-field    — NUEVO
 7. font-selector         — NUEVO
 8. image-upload-field    — NUEVO
 9. theme-preview         — NUEVO
10. layout.tsx            — pasar settings a BookingThemeProvider
11. settings/page.tsx     — Card Personalización Visual
12. settings/page.tsx     — Card Conectar Mercado Pago
13. pnpm lint && pnpm build
```

---

## Tabla de Archivos

| Archivo | Acción |
|---------|--------|
| `lib/definitions.ts` | Modificar — +7 campos en `User` |
| `lib/actions/auth.ts` | Modificar — extraer + mapear theme + mp |
| `lib/actions/property.ts` | Modificar — updatePropertySettings guarda theme |
| `lib/actions/property.ts` | Modificar — getPropertyBySlug retorna theme |
| `components/book/theme-preset-selector.tsx` | **CREAR** |
| `components/book/color-picker-field.tsx` | **CREAR** |
| `components/book/font-selector.tsx` | **CREAR** |
| `components/book/image-upload-field.tsx` | **CREAR** |
| `components/book/theme-preview.tsx` | **CREAR** |
| `app/[locale]/book/[slug]/layout.tsx` | Modificar — settings prop |
| `app/[locale]/dashboard/settings/page.tsx` | Modificar — 2 cards nuevas |

**7 modificados + 5 creados = 12 archivos.**
