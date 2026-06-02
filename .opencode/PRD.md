# PRD — SART (Sistema Administrativo de Reservas Turísticas)

## 1. Resumen Ejecutivo

SART es un SaaS de gestión hotelera (PMS) diseñado para pequeños y medianos alojamientos turísticos (hostels, cabañas, bungalows, hoteles boutique) que buscan reemplazar planillas Excel y procesos en papel por una plataforma moderna, multi-idioma, con calendario visual, control de huéspedes, reservas, precios dinámicos, punto de venta y sitio web público embebido.

---

## 2. Problemática

Los pequeños alojamientos gestionan sus reservas con:
- Hojas de cálculo (Excel/Google Sheets)
- Papel y cuadernos físicos
- Mensajes de WhatsApp desorganizados
- Fotos de DNI perdidas en galerías de celulares

Esto genera:
- Dobles reservas accidentales
- Pérdida de información de huéspedes
- Dificultad para saber disponibilidad en tiempo real
- Falta de control financiero
- Imagen poco profesional frente a huéspedes

---

## 3. Propuesta de Valor

SART ofrece una plataforma todo-en-uno que:
- Centraliza reservas, huéspedes, alojamientos y pagos
- Brinda disponibilidad en tiempo real
- Automatiza cálculos de precios y saldos
- Genera una presencia web profesional para cada propiedad
- Funciona en cualquier dispositivo (web + PWA)
- Soporta múltiples idiomas (español, inglés, portugués)

---

## 4. Usuarios y Perfiles

| Perfil | Descripción |
|--------|-------------|
| **Propietario/Administrador** | Dueño del alojamiento. Acceso completo al dashboard. |
| **Staff/Empleado** | Acceso al dashboard sin gestión de suscripción/configuración. |
| **Super Admin** | Acceso a reports y admin global del sistema SART. |
| **Huésped/Visitante** | Usuario final que ve el sitio web público del alojamiento y puede consultar disponibilidad. |

---

## 5. Funcionalidades por Módulo

### 5.1 Landing y Marketing
- Página de aterrizaje con features, ventajas vs. método tradicional, CTA a prueba gratuita
- Planes de suscripción (Pricing page) con trial, mensual y anual
- Páginas legales: Términos, Privacidad, Reembolso
- SEO con sitemap, robots, metadatos Open Graph

### 5.2 Autenticación
- Registro e inicio de sesión con email + contraseña
- Sesiones manejadas con Appwrite Auth + cookie `a_session`
- Integración con next-auth v5 (beta)
- Middleware de protección de rutas `/dashboard/*`

### 5.3 Dashboard Principal
- Tarjetas de estadísticas: ocupación, check-ins/outs hoy, huéspedes activos, ingresos
- Actividad diaria: check-ins, check-outs, reservas en curso, bloqueos
- Acciones rápidas: calendario, nueva reserva, nuevo alojamiento, gestionar precios, planes tarifarios

### 5.4 Calendario de Reservas
- Vista mensual interactiva con todas las habitaciones
- Celdas de día con reservas coloreadas por estado
- Drag & drop de habitaciones (reordenar)
- Agrupación visual por grupos de habitaciones
- Filtros por grupo y búsqueda de alojamientos
- Bloqueo de fechas (mantenimiento, reserva personal)

### 5.5 Gestión de Alojamientos (Habitaciones)
- CRUD completo de habitaciones
- Tipos: Privada / Compartida
- Categorías: Cabaña, Habitación, Bungalow, Otro
- Capacidad (camas)
- Comodidades: baño en suite, WiFi, TV, A/C, calefacción, minibar, caja fuerte, cochera, mascotas, fumadores
- Precio base por noche
- Agrupación en grupos (con color y orden)

### 5.6 Gestión de Huéspedes (Pasajeros)
- CRUD completo con foto de perfil
- Documentación: tipo, número, fotos frontal/dorso del documento
- Datos de contacto, dirección, nacionalidad, fecha de nacimiento
- Historial de reservas por huésped
- Búsqueda por nombre, email, teléfono, documento

### 5.7 Reservas
- Nueva reserva con selección de huésped, habitación, fechas
- Cálculo automático de precio (por noche * tarifa)
- Soporte para planes tarifarios (descuentos/recargos por % o monto fijo)
- Estados: Pendiente, Confirmada, Check-In, Check-Out, Bloqueada
- Pagos parciales con registro de comprobantes
- Múltiples medios de pago: Efectivo, Transferencia, Tarjeta, Otro
- Notas adicionales y hora de llegada
- Edición y eliminación de reservas

### 5.8 Historial de Reservas
- Tabla paginada con filtros por estado, pago, búsqueda textual
- Estadísticas: total reservas, esta semana, este mes
- Edición y eliminación desde la tabla

### 5.9 Precios Dinámicos
- Calendario de precios por día (tarifas diarias)
- Selección por rango de fechas y aplicación masiva
- Planes tarifarios: nombre, tipo (porcentaje o monto fijo), valor
- Visualización de tarifas especiales en verde

### 5.10 Punto de Venta (PDV)
- Comandas (órdenes) para visitantes y huéspedes
- Flujo de caja con ingresos y egresos
- Múltiples métodos de pago
- Estado de comandas: Abierta, Pagada, Cancelada
- Estadísticas: saldo neto, ingresos totales, gastos totales

### 5.11 Sitio Web Público (Booking Page)
- Página pública por propiedad (`/book/[slug]`)
- Plantilla visual configurable
- Slugs únicos por propiedad
- Configuración vía colección `websites`

### 5.12 Suscripciones y Facturación
- Integración con Paddle (pago recurrente)
- Planes: Prueba 30 días, Mensual, Anual
- Webhooks de Paddle para cambios de estado
- Guard (`subscription-guard`) que restringe acceso si no hay suscripción activa
- Banner de prueba con días restantes

### 5.13 Administración (Super Admin)
- Tabla de reportes globales
- Acceso a usuarios y suscripciones

### 5.14 Reporte de Bugs
- Botón flotante en toda la app
- Formulario con tipo (error/sugerencia/otro) y descripción
- Almacenamiento en Appwrite

### 5.15 Configuración de Cuenta
- Información de perfil
- Estado de suscripción
- Cierre de sesión

---

## 6. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 15.1 (App Router) |
| **Lenguaje** | TypeScript 5 (strict) |
| **Estilos** | Tailwind CSS 3 + shadcn/ui (new-york) + tailwind-merge + tailwindcss-animate |
| **i18n** | next-intl 4 (es, en, pt) |
| **Autenticación** | next-auth 5 beta + Appwrite Auth |
| **Backend** | Appwrite (BaaS) — DB, Storage, Auth, Users |
| **Pagos** | Paddle (@paddle/paddle-js + @paddle/paddle-node-sdk) |
| **Formularios** | react-hook-form + zod + @hookform/resolvers |
| **Calendario** | react-day-picker |
| **Tablas/Lists** | @tanstack/react-virtual, react-virtualized |
| **Drag & Drop** | @dnd-kit |
| **Editor** | Tiptap (rich text) |
| **PWA** | @ducanh2912/next-pwa |
| **Testing** | Vitest + Testing Library |
| **Linting** | ESLint 9 + @next/eslint-plugin-next |
| **PM** | pnpm |

---

## 7. Modelo de Datos (Colecciones Appwrite)

| Colección | Propósito |
|-----------|-----------|
| `Habitaciones` | Alojamientos con amenities, precio, tipo |
| `Reservas` | Reservas con fechas, estado, pagos, plan tarifario |
| `Huéspedes` | Pasajeros con datos personales y documentos |
| `Tarifas Diarias` | Precios especiales por día por habitación |
| `Planes Tarifarios` | Estrategias de precio (% o monto fijo) |
| `Grupos` | Agrupación de habitaciones |
| `Pagos` | Pagos asociados a reservas |
| `Suscripciones` | Planes contratados vía Paddle |
| `Sitios Web` | Configuración de sitio público por propiedad |
| `Comandas` | Órdenes del punto de venta |
| `Transacciones` | Flujo de caja del PDV |
| `Bug Reports` | Reportes de errores/sugerencias |

---

## 8. Flujo del Usuario

```
Landing → Registro (trial 30 días) → Dashboard
  ├── Configurar alojamientos
  ├── Configurar grupos
  ├── Crear planes tarifarios (opcional)
  ├── Recibir reservas (manual o web pública)
  │   └── Registrar huésped + pago
  ├── Gestionar calendario
  ├── Gestionar PDV (comandas/caja)
  └── Upgrade a plan pago (Paddle)
```

---

## 9. KPIs y Métricas

- **Ocupación**: % de habitaciones ocupadas
- **Check-ins/outs del día**
- **Huéspedes activos**
- **Ingresos totales y mensuales**
- **Reservas por semana/mes**
- **Saldo neto de caja (PDV)**

---

## 10. Roadmap / Próximas Iteraciones

| Fase | Funcionalidades |
|------|----------------|
| **Actual (v0.1)** | Core: auth, dashboard, calendario, habitaciones, huéspedes, reservas, precios, PDV, suscripciones, web pública |
| **Corta** | Channel manager (Booking.com, Airbnb, Hostelworld) |
| **Media** | Reportes avanzados, exportación de datos, facturación electrónica |
| **Larga** | App móvil nativa, check-in online, integración con pasarelas LATAM |

---

## 11. Restricciones y Riesgos

- **Appwrite gratuita**: límite de 1 bucket de storage (compartido entre documentos privados y fotos públicas)
- **Paddle**: disponible en países limitados; puede requerir merchant alternativo para LATAM
- **Build time**: las llamadas a Appwrite se mockean durante el build (`NEXT_PHASE=phase-production-build`)
- **Sin tests**: no hay suite de tests configurada aún (solo Vitest + Testing Library instalados)

---

## 12. Stackholders

- **Creador/Dev**: @Lauti (full-stack)
- **Usuarios target**: Propietarios de hostels, cabañas, B&Bs en LATAM (Argentina, Chile, Uruguay, etc.)
- **Competencia**: Lodgify, Hostify, Uplisting, PMS locales
