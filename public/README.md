# CSYD Parque - Sistema de Gestión de Club

## Descripción

Frontend interactivo de una sola página HTML para la gestión completa del Club Social y Deportivo Parque. Incluye:

- Gestión de socios (CRUD)
- Control de accesos (molinetes/RFID)
- Gestión de cuotas
- Finanzas (ingresos/gastos)
- Alquileres de canchas
- Dashboard en tiempo real

## Características Principales

### 1. Dashboard
- KPIs en tiempo real
- Socios totales, al día y morosos
- Ingresos, gastos y balance
- Auto-refresh cada 10 segundos

### 2. Gestión de Socios
- Búsqueda en tiempo real (nombre/DNI)
- Filtros por estado y categoría
- CRUD completo (Crear, Leer, Actualizar, Baja)
- Campos: nombre, DNI, RFID, categoría, teléfono, email, disciplinas
- Visualización de RFID en formato XXX-XXXXX

### 3. Control de Accesos (Molinetes)
- Validación de tarjetas RFID (10 dígitos EM4100 125kHz)
- Terminal visual con feedback en tiempo real
- Botones de prueba para desarrollo
- Registro de accesos con timestamp
- Estadísticas: total, permitidos, denegados
- Auto-refresh cada 5 segundos

### 4. Gestión de Cuotas
- Lista de socios morosos
- Emisión de cuotas (período y montos diferenciados)
- Registro de pagos (monto + método)

### 5. Finanzas
- Resumen KPI (ingresos, gastos, balance)
- Tabla de ingresos (categorías: Cuotas, Alquileres, Donaciones, Otro)
- Tabla de gastos (categorías: Servicios, Mantenimiento, Personal, Suministros, Otro)

### 6. Alquileres de Canchas
- Vista de cuadrícula con disponibilidad
- Filtros por fecha y cancha
- Booking de reservas
- Cancelación de reservas
- Canchas: F5-Cancha 1, F5-Cancha 2, F7-Cancha 3

### 7. Configuración
- Lista de puertas/molinetes
- Estado del sistema

## Especificaciones Técnicas

### Colores del Club
- Verde principal: #005020
- Verde oscuro: #003818
- Verde claro: #e6efe8
- Rojo: #e0282e
- Rojo oscuro: #b01b22
- Blanco: #ffffff

### Logo
Incrustado en base64 en el HTML (no requiere archivos externos)

### API Endpoints Soportados

#### Dashboard
- `GET /api/dashboard` - KPIs generales

#### Socios
- `GET /api/socios?buscar=X&estado=X&categoria=X` - Listar con filtros
- `POST /api/socios` - Crear
- `PUT /api/socios/:id` - Actualizar
- `DELETE /api/socios/:id` - Baja (soft delete)

#### Accesos
- `POST /api/acceso/validar` - Validar RFID
- `GET /api/accesos` - Historial de accesos
- `GET /api/accesos/stats` - Estadísticas

#### Cuotas
- `GET /api/cuotas/morosos` - Socios morosos
- `POST /api/cuotas/emitir` - Emitir cuotas
- `POST /api/cuotas/:id/pagar` - Registrar pago

#### Finanzas
- `GET /api/finanzas/resumen` - Resumen
- `GET /api/ingresos` - Listar ingresos
- `POST /api/ingresos` - Crear ingreso
- `GET /api/gastos` - Listar gastos
- `POST /api/gastos` - Crear gasto

#### Alquileres
- `GET /api/alquileres?fecha=X&cancha=X` - Listar con filtros
- `POST /api/alquileres` - Crear reserva
- `DELETE /api/alquileres/:id` - Cancelar

#### Configuración
- `GET /api/puertas` - Listar puertas
- `GET /api/health` - Estado del sistema

## RFID Format

- **Formato almacenado:** 10 dígitos (ej. "0010048721")
- **Formato mostrado:** XXX-XXXXX (ej. "001-48721")
- **Estándar:** EM4100 125kHz

### Códigos de Prueba
- Al día: `0010048721` → `001-48721`
- Moroso: `0010048722` → `001-48722`
- No registrado: `0099999999` → `009-99999`

## Instalación

1. Copiar `index.html` a la carpeta `public/`
2. Asegurarse que el backend API está ejecutándose en el mismo origin
3. Abrir en navegador: `http://localhost:PORT/`

## Compatibilidad

- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Responsive design (desktop, tablet, mobile)
- No requiere dependencies externas
- HTML5 + ES6+ JavaScript

## Características de UX

- Modal reutilizable para todos los formularios
- Búsqueda con debounce (300ms)
- Notificaciones toast para feedback
- Validación de formularios
- Manejo de errores de API
- Auto-refresh de datos en tiempo real
- Transiciones suaves
- Badges con colores semánticos (éxito, error, advertencia, info)

## Rendimiento

- Carga único archivo HTML (156 KB incluyendo logo)
- Sin dependencias externas
- Llamadas API con manejo eficiente de errores
- Debouncing en búsquedas
- Auto-refresh inteligente por página

## Notas Importantes

- El logo está incrustado como base64 en el HTML
- No requiere servidor CORS (mismo origin)
- Todos los datos vienen del backend API (sin datos hardcodeados)
- El sistema soporta soft-delete de socios
- Las cuotas pueden tener montos diferentes por categoría

## Soporte

Para soporte técnico, contactar al equipo de desarrollo de Atreus Digital.
