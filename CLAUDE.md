# CLAUDE.md — CSyD Parque · Sistema de Gestión

## Qué es este proyecto

Sistema integral de gestión para el **Club Social y Deportivo Parque** (colores: blanco, verde #005020, rojo #e0282e).

Incluye: padrón de socios, cuotas y cobranzas, finanzas (ingresos/gastos), alquileres de canchas, control de acceso con molinetes RFID, y módulo de IA.

## Stack

- **Backend:** Node.js + Express + sql.js (SQLite puro en JavaScript)
- **Frontend:** HTML/CSS/JS single-file (public/index.html), sin frameworks
- **Base de datos:** SQLite (archivo csyd_parque.db, se crea automáticamente)

## Estructura de archivos

```
csyd-parque-api-molinetes/
├── server.js              ← API REST (Express)
├── package.json
├── csyd_parque.db         ← SQLite (se genera al arrancar)
├── public/
│   └── index.html         ← Frontend interactivo
├── API-Molinetes-CSyD-Parque.docx  ← Documentación para proveedor de molinetes
└── CLAUDE.md              ← Este archivo
```

## Cómo correr

```bash
npm install
node server.js
# → http://localhost:3000 (frontend + API)
```

## API Endpoints

### Acceso / Molinetes (los que usa la placa controladora)
- `POST /api/acceso/validar` — body: `{rfid, puerta, ip_placa}` → valida acceso
- `GET /api/acceso/padron` — descarga padrón para sync offline
- `GET /api/health` — health check

### Socios (CRUD)
- `GET /api/socios?buscar=X&estado=X&categoria=X`
- `GET /api/socios/:id`
- `POST /api/socios` — body: `{nombre, dni, rfid, categoria, telefono, email, disciplinas}`
- `PUT /api/socios/:id` — body: campos a actualizar
- `DELETE /api/socios/:id` — baja lógica

### Cuotas
- `POST /api/cuotas/emitir` — body: `{periodo, monto_activo, monto_cadete, monto_familiar}`
- `POST /api/cuotas/:id/pagar` — body: `{monto, metodo_pago}`
- `GET /api/socios/:id/cuotas`
- `GET /api/cuotas/morosos`

### Finanzas
- `GET /api/ingresos`, `POST /api/ingresos`
- `GET /api/gastos`, `POST /api/gastos`
- `GET /api/finanzas/resumen`

### Alquileres
- `GET /api/alquileres?fecha=X&cancha=X`
- `POST /api/alquileres` — body: `{cancha, fecha, hora, cliente, telefono, monto}`
- `DELETE /api/alquileres/:id`

### Otros
- `GET /api/accesos` — log de accesos
- `GET /api/accesos/stats`
- `GET /api/dashboard` — KPIs generales
- `GET /api/puertas`

## Tecnología de llaves RFID

- **Tipo:** EM4100 (solo lectura), 125 kHz
- **Formato ID:** 10 dígitos → Facility Code (3) + Card Number (5) + check (2)
- **Visualización:** `XXX-XXXXX` (ej: `001-48721`)
- **Interfaz lector:** Wiegand 26/34 bits
- **Placas:** ZKTeco InBio / HikVision DS-K2600, conexión IP directa al servidor

## Reglas de negocio

1. Un socio con estado_cuota = "Moroso" no puede pasar el molinete
2. Un socio con estado_cuota = "Suspendido" no puede pasar
3. Socios "Vitalicio" no pagan cuota y siempre tienen acceso
4. Al registrar pago completo de cuota, el estado del socio se actualiza automáticamente a "Al día"
5. Baja de socio es lógica (activo = 0), no se borra el registro
6. La base de datos se persiste a disco después de cada escritura

## Instrucciones para Claude

Cuando trabajes en este proyecto:
- Mantené la arquitectura actual: un server.js con Express y un index.html single-file
- No agregues frameworks de frontend (React, Vue, etc.) salvo que yo lo pida
- La base SQLite es embebida con sql.js — no cambiar a PostgreSQL/MySQL salvo que yo lo pida
- Los colores del club son sagrados: verde #005020, rojo #e0282e, blanco
- El logo está embebido como base64 en el index.html
- Todos los endpoints deben devolver JSON
- El campo RFID siempre es de 10 dígitos (formato EM4100)

## Próximos pasos pendientes

- [ ] Integración con Mercado Pago para cobro de cuotas online
- [ ] Bot de WhatsApp Business para recordatorios automáticos
- [ ] Facturación electrónica AFIP (factura C / A)
- [ ] App móvil para socios (carnet digital + reserva canchas)
- [ ] Reconocimiento facial opcional en molinetes
- [ ] Módulo de IA: predicción de morosidad, optimización de turnos, detección de anomalías
- [ ] Autenticación y roles (admin, tesorería, recepción, profesor, socio)
- [ ] Tests automatizados
