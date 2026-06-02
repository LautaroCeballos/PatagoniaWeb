# Plan de Corrección — Skeleton infinito en /dashboard/calendar

## Resumen

El calendario en `/es/dashboard/calendar` muestra el skeleton de carga y eventualmente el placeholder "Configura tus Alojamientos" aunque existan habitaciones en la base de datos.

**Estado actual:** ✅ Investigación completa → ✅ Prioridades 1-3 implementadas → ⏳ Prioridad 4 pendiente

---

## ✅ Investigación — Completada

| Paso | Descripción | Estado |
|------|-------------|--------|
| Appwrite MCP | Verificar colecciones, índices, documentos | ✅ |
| Chrome DevTools | Capturar console errors, DOM, network en vivo | ✅ |
| Análisis código | 5 sub-agentes (arquitectura, frontend, integración, explore, database) | ✅ |
| Race condition | Identificada en GroupsContext.tsx:49-51 y PricingContext.tsx:48 | ✅ |
| fetchBookings sin filtro | `startDate`/`endDate` aceptados pero nunca pasados a Appwrite | ✅ |
| Plan guardado | `PLAN_CALENDARIO_SKELETON.md` creado | ✅ |

---

## 🔧 Implementación — En progreso

### Prioridad 1 — Arreglar race condition en contexts (desatasca el skeleton)
- [x] **1A:** Leer `GroupsContext.tsx` — confirmar código exacto líneas 45-83
- [x] **1B:** Reemplazar `isFetching.current` guard con variable local `cancelled` en `GroupsContext.tsx`
- [x] **1C:** Mismo fix en `PricingContext.tsx`

### Prioridad 2 — Reducir límites de queries
- [x] **2A:** `lib/actions/rooms.ts:30` — `limit(5000)` → `limit(100)`
- [x] **2B:** `lib/actions/groups.ts:31` — `limit(5000)` → `limit(100)`

### Prioridad 3 — Agregar filtros de fecha a fetchBookings
- [x] **3:** `lib/actions/bookings.ts` — pasar `Query.greaterThanEqual`/`lessThanEqual` cuando `startDate`/`endDate` estén presentes

### Prioridad 4 — Hallazgos secundarios
- [ ] **4:** Agregar estados de error en contexts
- [ ] **5:** Agregar `NEXT_APPWRITE_COLLECTION_COMANDA_ID` y `TRANSACCION_ID` a `.env.local`
- [ ] **6:** Estabilizar `virtualItems` en calendar-grid (memoizar)

---

## 🔍 Causas Raíz (verificadas)

### #1: Timeout en fetchHabitaciones y fetchGuests (>60s)
**Console errors (DevTools):**
```
Error loading guests: Timeout waiting for guests
Error loading rooms: Timeout waiting for rooms
```
**Datos Appwrite:** 14 habitaciones, 26 huéspedes — datos mínimos, tiempo excesivo.

### #2: Race condition en GroupsContext/PricingContext
El guard `if (isFetching.current) return` combinado con React Strict Mode (doble montaje en dev) deja `loadingGrupos=true` permanente.

### #3: fetchBookings ignora startDate/endDate
Siempre devuelve las mismas reservas sin filtrar por rango — datos innecesarios cada scroll.

---

## Archivos relevantes

| Archivo | Líneas | Problema |
|---------|--------|----------|
| `context/GroupsContext.tsx` | 49-51 | Race condition guard |
| `context/PricingContext.tsx` | 48 | Race condition guard |
| `lib/actions/rooms.ts` | 30 | `limit(5000)` |
| `lib/actions/groups.ts` | 31 | `limit(5000)` |
| `lib/actions/bookings.ts` | 30-35 | Faltan filtros fecha |
| `lib/server/appwrite.ts` | 20 | Posible bottleneck |
| `context/AppContext.tsx` | 17-23 | `safeHook` silencia errores |
