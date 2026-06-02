# Plan de Integración OTA — SART + Beds24 (Channel Manager)

> **Fecha**: 2026-05-19
> **Validado contra**: Beds24 API v2 (Context7), Appwrite SDK docs
> **Stack**: Next.js 15, Appwrite, TypeScript

---

## Arquitectura General

```
SART (Next.js App)
    │
    ├── lib/actions/ota/             ← Server Actions
    │   ├── types.ts                 ← Tipos compartidos
    │   ├── beds24.client.ts         ← Cliente HTTP Beds24 (token auth)
    │   ├── connections.ts           ← CRUD conexiones
    │   ├── room-mappings.ts         ← Mapeo habitaciones SART ↔ Beds24
    │   └── sync.ts                  ← Orquestador push/pull
    │
    ├── app/api/cron/sync/route.ts   ← Vercel Cron cada 5 min
    ├── app/[locale]/dashboard/ota/  ← Página configuración OTA
    ├── components/ota/              ← UI components
    │   ├── connection-form.tsx
    │   ├── room-mapping-list.tsx
    │   └── sync-status-card.tsx
    │
    └── messages/{es,en,pt}.json     ← Traducciones i18n
                │
                ▼ (HTTPS / REST API v2)
        ┌──────────────────────┐
        │      Beds24 API      │
        │                      │
        │  Auth: token header  │
        │  Base: beds24.com/v2 │
        │  Credits: 5min window│
        └──────────┬───────────┘
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
 Booking.com   Airbnb      Hostelworld
```

---

## APIs Reales (Beds24 API v2)

### Autenticación (2-step token flow)

```
Paso 1 - Setup (una vez):
  Usuario genera "Invite Code" en Beds24 → Settings → API → Authentication
  SART: GET /authentication/setup  header: { inviteCode }
  → Response: { refreshToken: "..." }  ← Se guarda cifrado en Appwrite

Paso 2 - Runtime (en cada sync o cuando expira):
  SART: GET /authentication/token  header: { refreshToken }
  → Response: { token: "...", expiresIn: 3600 }
  → Usar token en header de todos los requests: { token: "..." }

Paso 3 - Integration partners (opcional):
  Header adicional: { organization: "nombre" }

Nota: Refresh tokens no expiran si se usan al menos cada 30 días.
```

### Endpoints Clave

| Acción | Endpoint | Método | Params clave |
|---|---|---|---|
| Push disponibilidad | `/inventory/rooms/calendar` | POST | `roomId`, `calendar[{from, to, numAvail, price1}]` |
| Pull reservas | `/bookings` | GET | `modifiedFrom`, `channel`, `roomId`, `status` |
| Get rooms | `/rooms` | GET | `propertyId` (required) |
| Get properties | `/properties` | GET | `id`, `includeAllRooms` |
| Push precios | `/inventory/rooms/calendar` | POST | mismo que disponibilidad + `price1` |
| Get disponibilidad | `/inventory/rooms/availability` | GET | `roomId`, `startDate`, `endDate` |
| Create/update booking | `/bookings` | POST | `roomId`, `arrival`, `departure`, guest data |

### Rate Limiting (Credit System)

- Ventana de 5 minutos con límite de créditos
- Headers de respuesta:
  - `X-FiveMinCreditLimit` — máximo de créditos por ventana
  - `X-FiveMinCreditLimit-Remaining` — créditos restantes
  - `X-RequestCost` — costo del request actual
- Estrategia: antes de cada request, verificar remaining. Si < 10, esperar al reset.

### Booking Schema (campos relevantes)

```
id: integer
roomId: integer
propertyId: integer
channel: "booking" | "airbnb" | "hostelworld" | "direct" | ...
status: "confirmed" | "new" | "request" | "cancelled" | "black" | "inquiry"
subStatus: "actionRequired" | "cancelledByGuest" | "cancelledByHost" | "noShow" | ...
arrival: "YYYY-MM-DD"
departure: "YYYY-MM-DD"
numAdult: integer
numChild: integer
firstName, lastName, email, mobile, address, city, country: string
bookingTime: datetime (UTC)
modifiedTime: datetime
cancelTime: datetime | null
totalPrice: number
currency: string
commission: number
tax: number
apiReference: string (max 100)
```

---

## Modelo de Datos (Appwrite)

### Colecciones Nuevas

#### 1. `ota_connections` — Conexiones Beds24 por usuario

| Campo | Tipo | Req | Descripción |
|---|---|---|---|
| `userId` | String(36) | Sí | FK al usuario |
| `name` | String(100) | Sí | Nombre descriptivo |
| `refreshToken` | String(500) | Sí | Refresh token (cifrado AES-256-GCM) |
| `propertyId` | Integer | No | ID de propiedad en Beds24 (se autodetecta) |
| `propertyName` | String(200) | No | Nombre de la propiedad en Beds24 |
| `enabled` | Boolean | Sí | Conexión activa/inactiva |
| `lastSyncAt` | DateTime | No | Última sincronización exitosa |
| `lastSyncStatus` | String(20) | No | `ok`, `error`, `in_progress` |
| `syncInterval` | Integer | No | Minutos entre sync (default: 5) |
| `lastCreditReset` | DateTime | No | Para trackear rate limiting |
| `creditsRemaining` | Integer | No | Créditos restantes en ventana actual |

Índice: `user_connections` — `userId` (ASC)

#### 2. `ota_room_mappings` — Mapeo habitaciones SART ↔ Beds24

| Campo | Tipo | Req | Descripción |
|---|---|---|---|
| `userId` | String(36) | Sí | |
| `connectionId` | String(36) | Sí | FK a ota_connections |
| `roomId` | String(36) | Sí | ID de habitación en SART |
| `beds24RoomId` | Integer | Sí | ID de room en Beds24 |
| `beds24RoomName` | String(100) | No | Nombre en Beds24 (referencia) |
| `enabled` | Boolean | Sí | Mapping activo |

Índices:
- `room_connection` — `connectionId` (ASC), `roomId` (ASC) — **Unique**
- `user_mappings` — `userId` (ASC)

#### 3. `ota_sync_log` — Auditoría de sincronización

| Campo | Tipo | Req | Descripción |
|---|---|---|---|
| `userId` | String(36) | Sí | |
| `connectionId` | String(36) | Sí | |
| `direction` | String(10) | Sí | `inbound` (OTA→SART), `outbound` (SART→OTA) |
| `action` | String(30) | Sí | `push_availability`, `pull_booking`, `push_price`, `error` |
| `status` | String(10) | Sí | `success`, `failed` |
| `resourceId` | String(36) | No | ID de reserva/room en SART |
| `otaReference` | String(100) | No | ID en Beds24/OTA |
| `requestPayload` | String(5000) | No | JSON del request |
| `responsePayload` | String(5000) | No | JSON del response |
| `errorMessage` | String(500) | No | Mensaje si falló |
| `executionTimeMs` | Integer | No | Tiempo de ejecución |
| `createdAt` | DateTime | Sí | |

Índice: `log_lookup` — `connectionId` (ASC), `createdAt` (DESC)

### Campos Nuevos en Colección `reservas`

| Campo | Tipo | Req | Descripción |
|---|---|---|---|
| `otaReservationId` | String(100) | No | ID de la reserva en Beds24 (integer como string) |
| `otaChannel` | String(20) | No | `booking`, `airbnb`, `hostelworld`, `direct` |
| `otaStatus` | String(30) | No | Estado original en la OTA |
| `otaLastSync` | DateTime | No | Última sincronización |

### Variables de Entorno Nuevas

```bash
# .env.local
NEXT_APPWRITE_COLLECTION_OTA_CONNECTIONS_ID=
NEXT_APPWRITE_COLLECTION_OTA_ROOM_MAPPINGS_ID=
NEXT_APPWRITE_COLLECTION_OTA_SYNC_LOG_ID=

# Clave AES-256 para cifrar refresh tokens (generar con: openssl rand -hex 32)
OTA_ENCRYPTION_KEY=

# Solo si sos Integration Partner de Beds24
BEDS24_ORG_NAME=

# Para proteger el endpoint cron
CRON_SECRET=
```

---

## Flujos de Sincronización

### Push de Disponibilidad (SART → Beds24 → OTAs)

```
Evento: se crea/modifica/elimina una reserva en SART
  1. Calcular disponibilidad actual:
     - Consultar reservas activas + bloques
     - Para cada habitación, generar array de {fecha, disponible}
  2. Agrupar por mapping de Beds24
  3. POST /inventory/rooms/calendar con numAvail:
     - Privada: numAvail = 0 (ocupada) | 1 (libre)
     - Compartida: numAvail = camas disponibles
  4. Registrar en sync_log
  5. Si falla → cola de reintentos (exponential backoff)
```

### Pull de Reservas (Beds24 → SART)

```
Cron cada 5 min:
  1. Para cada conexión activa:
     a. POST /authentication/token → access token
     b. GET /bookings?modifiedFrom={lastSync}&status[]=confirmed&status[]=new&status[]=cancelled
     c. Para cada booking:
        - Buscar en SART por otaReservationId
        - Si no existe:
          * Crear huésped (firstName, lastName, email, mobile)
          * Crear reserva con source=otaChannel
          * Asignar a habitación según room mapping
        - Si existe:
          * Si cambió status a "cancelled" → cancelar en SART
          * Si modifiedTime > otaLastSync → actualizar fechas/datos
     d. Actualizar lastSyncAt
     e. Registrar en sync_log
```

### Mapeo de Estados

| Beds24 Status | SART Estado | Acción |
|---|---|---|
| `confirmed` | `Confirmada` | Crear o confirmar |
| `new` | `Pendiente` | Crear como pendiente |
| `request` | `Pendiente` | Crear con flag de request |
| `cancelled` | eliminada | Eliminar de SART (o marcar cancelada) |
| `noShow` (subStatus) | `No_Show` | Nuevo estado opcional |
| `cancelledByGuest` | - | Registrar quién canceló |
| `cancelledByHost` | - | Registrar quién canceló |

---

## Archivos a Crear y Modificar

### Nuevos (10 archivos)

| # | Archivo | Propósito |
|---|---|---|
| 1 | `lib/actions/ota/types.ts` | Tipos: OtaConnection, OtaRoomMapping, SyncLogEntry, Beds24Booking, CalendarItem |
| 2 | `lib/actions/ota/ota-crypto.ts` | Cifrado AES-256-GCM de refresh tokens |
| 3 | `lib/actions/ota/beds24.client.ts` | Cliente HTTP: auth 2-step, setAvailability, getBookings, getRooms |
| 4 | `lib/actions/ota/connections.ts` | Server Actions: create/get/update/delete/test connection |
| 5 | `lib/actions/ota/room-mappings.ts` | Server Actions: fetch Beds24 rooms, create/get/delete mappings |
| 6 | `lib/actions/ota/sync.ts` | Orquestador: pushAvailability, pullReservations, syncAll |
| 7 | `app/[locale]/dashboard/ota/page.tsx` | Página de configuración OTA en dashboard |
| 8 | `components/ota/connection-form.tsx` | Formulario: nombre + invite code + test connection |
| 9 | `components/ota/room-mapping-list.tsx` | Lista de mappings con selects para mapear habitaciones |
| 10 | `components/ota/sync-status-card.tsx` | Card de estado de conexión |
| 11 | `app/api/cron/sync/route.ts` | Endpoint para Vercel Cron |

### Modificados (5 archivos)

| # | Archivo | Cambio |
|---|---|---|
| 1 | `lib/definitions.ts` | Agregar campos OTA al type `Reserva` |
| 2 | `lib/actions/bookings.ts` | `addNewBooking`, `modifyBooking`, `deleteBooking` → disparar sync post-operación |
| 3 | `components/app/header.tsx` | Agregar link "OTA" al sidebar (con icono Globe o Wifi) |
| 4 | `appwrite_setup.md` | Documentar las 3 nuevas colecciones |
| 5 | `messages/es.json` (y en, pt) | Traducciones: "OTA", "Conectar", "Sincronizar", "Disponibilidad" |

---

## Orden de Implementación

### Fase 1 — Base (semana 1)

| Día | Tareas |
|---|---|
| 1-2 | `lib/actions/ota/types.ts` + `ota-crypto.ts` + colecciones Appwrite |
| 3-4 | `beds24.client.ts` — autenticación + getRooms + getBookings + setAvailability |
| 5 | `connections.ts` + `room-mappings.ts` — Server Actions CRUD |
| 6-7 | UI: `connection-form.tsx` + `room-mapping-list.tsx` + página OTA |

### Fase 2 — Sincronización (semana 2)

| Día | Tareas |
|---|---|
| 1-2 | `sync.ts` — pushAvailability + pullReservations |
| 3 | Modificar `bookings.ts` — hooks post-create/update/delete |
| 4 | `app/api/cron/sync/route.ts` — cron endpoint |
| 5 | `sync-status-card.tsx` — UI de estado |
| 6-7 | Tests manuales + ajustes + traducciones |

### Fase 3 — Robustez (semana 3)

| Tarea | Esfuerzo |
|---|---|
| Rate limiting (track de créditos Beds24) | Medio |
| Cola de reintentos con exponential backoff | Medio |
| Dashboard de logs con filtros | Bajo |
| Alertas de error (toast + badge) | Bajo |
| Pruebas de integración (sandbox Beds24) | Alto |

---

## Estrategia de Errores

```
Error HTTP → Decisión:
  401/403 (auth)       → refresh token expiró → re-authenticate
  429 (rate limit)     → esperar a reset de ventana (ver header)
  400 (bad request)    → log + alerta (payload inválido, requiere revisión manual)
  500 (server)         → reintentar 3x con backoff (30s, 2min, 10min)
  Timeout (30s)        → reintentar 2x con backoff (1s, 5s)
  Red / DNS error      → reintentar 3x con backoff (10s, 30s, 60s), luego marcar conexión como error

Logging:
  - Siempre registrar en ota_sync_log
  - Si > 3 errores consecutivos → marcar conexión como error
  - Notificar al usuario con toast/badge en sidebar
```

---

## Costos Beds24 (2026)

| Plan | Props | Costo/mes | Channels incluidos |
|---|---|---|---|
| Starter | 1-5 | ~€2-10 | Booking + Airbnb |
| Basic | 5-25 | ~€2.5-3/prop | Booking + Airbnb + Hostelworld |
| Advanced | 25-100 | ~€5/prop | Todos + API acceso completo |
| Enterprise | 100+ | Custom | Todo |

Para 5-50 propiedades: ~**€25-250/mes**. Los 3 canales (Booking, Airbnb, Hostelworld) están incluidos.

---

## Notas Técnicas Adicionales

### Cifrado de Refresh Tokens

```typescript
// Algoritmo: AES-256-GCM (autenticado)
// Key: OTA_ENCRYPTION_KEY (64 chars hex = 32 bytes)
// IV: 12 bytes random (unique por token)
// Tag: 16 bytes (autenticación, adjunto al ciphertext)

export function encrypt(plaintext: string): string {
  const key = Buffer.from(process.env.OTA_ENCRYPTION_KEY!, 'hex')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Formato: iv:tag:ciphertext (base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}
```

### Rate Limiting — Implementación

```typescript
// En beds24.client.ts, después de cada request:
const remaining = parseInt(response.headers.get('X-FiveMinCreditLimit-Remaining') || '0')
const resetsIn = parseInt(response.headers.get('X-FiveMinCreditLimit-ResetsIn') || '300')
const cost = parseInt(response.headers.get('X-RequestCost') || '1')

// Si quedan pocos créditos, esperar al reset
if (remaining < cost * 2) {
  await sleep(resetsIn * 1000)
}
```

### Pull Incremental

```typescript
// Usar modifiedFrom para traer solo cambios desde la última sync
const lastSync = connection.lastSyncAt?.toISOString() || 
                 new Date(0).toISOString() // o último mes por defecto

const bookings = await client.getBookings({
  modifiedFrom: lastSync,
  status: ['confirmed', 'new', 'cancelled']
})
// modifiedTime se setea = createdTime cuando se crea la booking
```

---

## Referencias

- Beds24 API v2: https://beds24.com/api/v2
- Beds24 API Overview: https://beds24.com/api/v2/index
- Appwrite Database: https://appwrite.io/docs/products/databases
- Appwrite Node SDK: https://appwrite.io/docs/references/cloud/server-nodejs/
