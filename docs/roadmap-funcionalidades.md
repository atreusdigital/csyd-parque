# Roadmap de Funcionalidades — CSyD Parque

> Documento de producto. Compara el sistema actual del Club Social y Deportivo Parque contra los líderes del mercado (Playtomic, Sportclubby, MatchPoint/TPC, Nubapp, Spordle, SportEasy y los SaaS argentinos CuotaQ, PortalSocios, Go Club, ClubFlex, NexoSmart, DigitalClub) y propone un plan priorizado para los próximos 12-18 meses.
>
> Autor: Product Management · Fecha: mayo 2026 · Estado: propuesta para revisión

---

## 1. Resumen ejecutivo

El sistema de CSyD Parque ya cubre la **columna vertebral operativa**: padrón, cuotas con pago, finanzas (ingresos/egresos), alquiler de canchas con grilla + Mercado Pago + turnos fijos, control de acceso por molinete RFID, dashboard de KPIs, asistente de IA y usuarios con roles. Eso es más de lo que tienen muchos clubes de barrio, que siguen con Excel y cuaderno.

Donde el sistema **se queda corto frente a los líderes** es en tres frentes que mueven la aguja del negocio:

1. **Recaudación recurrente y automática.** Hoy el cobro de cuota es "simple/manual". Los líderes recaudan solas con débito automático, recordatorios por WhatsApp/email y emisión masiva. Esto es lo que reduce la morosidad (los SaaS argentinos hablan de bajar morosidad 40-70%). **Es la mayor oportunidad de ingreso del club.**
2. **Autogestión del socio.** Todos los competidores tienen un **portal/app del socio con carnet digital QR**. El socio se cobra a sí mismo, reserva, paga y consulta su estado de cuenta sin ocupar a recepción. Reduce costo operativo y fricción.
3. **Comunicación proactiva.** WhatsApp/email automáticos para vencimientos, reservas y comunicados. Es barato, mejora cobranza y retención.

El resto (deportivo, BI avanzado, pricing dinámico, IA) es valioso pero secundario respecto a "cobrar bien y que el socio se gestione solo".

**Tesis del dueño:** cada peso que invertimos debe (a) aumentar recaudación de cuotas y alquileres, (b) bajar morosidad, o (c) bajar horas de recepción/tesorería. Priorizamos en ese orden.

---

## 2. Qué tiene cada líder que a nosotros nos falta

| Funcionalidad | Playtomic | Sportclubby | MatchPoint | Nubapp | Spordle/SportEasy | SaaS AR (CuotaQ, PortalSocios, etc.) | ¿Lo tenemos? |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Portal/app del socio (autogestión) | Sí | Sí | Sí | Sí | Sí | Sí | **No** |
| Carnet digital con QR | Sí | Sí | Sí | Sí | — | Sí | **No** |
| Débito automático recurrente de cuota | — | Sí | Sí | Sí | — | **Sí (core)** | **No** (pago manual) |
| Recordatorios automáticos WhatsApp/email | — | Sí | Sí | Sí | Sí | **Sí (core)** | **No** |
| Emisión masiva de cuotas + recibos | — | Sí | Sí | Sí | — | Sí | Parcial (emisión sí, recibo no) |
| Grupo familiar / cuentas vinculadas | — | Sí | **Sí** | Sí | Sí | Sí | **No** |
| Reserva online por el socio (autoservicio) | **Sí** | Sí | Sí | Sí | — | Sí | Parcial (grilla pública sí, sin login de socio) |
| Lista de espera de canchas | **Sí** | Sí | Sí | Sí | — | — | **No** |
| Precios dinámicos por franja/demanda | **Sí** | Sí | Sí | — | — | — | Parcial (precio fijo por cancha) |
| Bonos/abonos/packs de horas | Sí | Sí | **Sí** | Sí | — | Sí | **No** |
| Cursos/escuelas con inscripción y cupo | — | Sí | **Sí** | Sí | Sí | Sí | **No** |
| Fixtures / calendario deportivo | — | — | — | — | **Sí** | — | **No** |
| Control de asistencia a entrenamientos | — | Sí | — | Sí | **Sí** | — | **No** (solo acceso molinete) |
| Convocatorias / planteles / categorías | — | — | — | — | **Sí** | — | **No** |
| Reportería/BI con ocupación y analítica | **Sí** | Sí | Sí | Sí | Sí | Sí | Parcial (dashboard KPI básico) |
| Tienda / cobro de eventos y kioscos | — | Sí | Sí | Sí | — | Sí | **No** |
| Comunicados masivos / muro / notificaciones | Sí (chat) | Sí | Sí | Sí | **Sí** | Sí | **No** |
| Padrón con foto del socio | — | Sí | Sí | Sí | Sí | Sí | A confirmar |

---

## 3. Matriz Impacto vs Esfuerzo (priorización)

Escala: Impacto y Esfuerzo de 1 (bajo) a 5 (alto). El esfuerzo está estimado **sobre el stack actual** (Express + Supabase/Postgres + HTML single-file + Vercel). **Quick Win** = impacto alto / esfuerzo bajo o medio.

| # | Funcionalidad | Área | Impacto | Esfuerzo | Quick Win | Fase |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | Recordatorios automáticos WhatsApp/email de vencimiento | Comunicación | 5 | 2 | **Quick Win** | Corto |
| 2 | Recibo/comprobante de pago (PDF + envío) | Cobranzas | 4 | 2 | **Quick Win** | Corto |
| 3 | Carnet digital con QR (validez según estado de cuota) | App/Carnet | 5 | 2 | **Quick Win** | Corto |
| 4 | Estado de socio = QR del carnet en el molinete | Control acceso | 4 | 2 | **Quick Win** | Corto |
| 5 | Cobro de cuota online con link MP (no presencial) | Cobranzas | 5 | 2 | **Quick Win** | Corto |
| 6 | Portal del socio (login + estado de cuenta + pagar) | Socios/CRM | 5 | 3 | Sí | Corto |
| 7 | Suscripción / débito automático recurrente (MP Suscripciones) | Cobranzas | 5 | 3 | Sí | Corto-Medio |
| 8 | Grupo familiar (cuentas vinculadas, cuota familiar) | Socios/CRM | 4 | 3 | Sí | Medio |
| 9 | Reserva de cancha por el socio (autoservicio con login) | Reservas | 4 | 3 | Sí | Medio |
| 10 | Lista de espera de canchas | Reservas | 3 | 2 | Sí | Medio |
| 11 | Comunicados masivos segmentados (email/WhatsApp) | Comunicación | 4 | 2 | **Quick Win** | Medio |
| 12 | Inscripción a disciplinas/escuelas con cupo y cobro | Deportivo | 4 | 3 | Sí | Medio |
| 13 | Control de asistencia a entrenamientos | Deportivo | 3 | 3 | — | Medio |
| 14 | Reportería/BI: ocupación, recaudación por disciplina, morosidad | Reportería/BI | 4 | 3 | Sí | Medio |
| 15 | Bonos/packs de horas de cancha | Reservas | 3 | 3 | — | Medio |
| 16 | Precios dinámicos por franja/día | Reservas | 3 | 2 | Sí | Medio |
| 17 | Fixtures y calendario deportivo (Futsal, Baby, etc.) | Deportivo | 3 | 4 | — | Largo |
| 18 | App móvil nativa (PWA primero) | App/Carnet | 4 | 4 | — | Largo |
| 19 | IA: predicción de morosidad y churn | Automatización/IA | 3 | 4 | — | Largo |
| 20 | IA: optimización de ocupación de canchas | Automatización/IA | 3 | 4 | — | Largo |
| 21 | Facturación electrónica AFIP (factura C) | Cobranzas | 3 | 4 | — | Largo |
| 22 | Tienda / cobro de eventos, kiosco, buffet | Cobranzas | 2 | 4 | — | Largo |

### Lectura de la matriz

```
                       IMPACTO
   alto │  (16)(10)        │  (1)(3)(5)(2)(4)(11)
        │                  │  (6)(7)(8)(9)(12)(14)
        │                  │  (18)
  medio │  (15)(13)        │  (17)(19)(20)(21)
        │  (22)            │
   bajo │                  │
        └──────────────────┴──────────────────────
            alto esfuerzo      bajo/medio esfuerzo
```

Los **Quick Wins** (cuadrante superior derecho) son el foco inmediato: recordatorios, carnet QR, link de pago y recibo. Son baratos sobre este stack y atacan directo la recaudación y la morosidad.

---

## 4. Detalle de las features top (con nota de implementación)

Para cada una: **qué es**, **valor para el club** y **cómo encararla con el stack actual**.

### Área: Cobranzas / Finanzas

#### F1 · Recordatorios automáticos de vencimiento (WhatsApp + email)
- **Qué es:** mensaje automático al socio cuando la cuota está por vencer y cuando entra en mora, con link de pago incluido.
- **Valor:** es la palanca #1 contra la morosidad. Los SaaS argentinos reportan caídas de morosidad del 40-70% solo con esto. Cada cuota deportiva ronda los $48.000; recuperar 10 socios morosos por mes ya paga el desarrollo.
- **Implementación:** cron diario (Vercel Cron o un endpoint protegido disparado por scheduler) que consulta socios con cuota vencida/por vencer en Supabase y envía:
  - **Email:** integrar un proveedor transaccional (Resend o Brevo) desde `server.js`.
  - **WhatsApp:** API de WhatsApp Business (Meta Cloud API) o un proveedor (e.g. 360dialog / Twilio). Empezar con plantillas aprobadas para "vencimiento de cuota".
  - Loggear cada envío en una tabla `notificaciones` para no duplicar y medir efectividad.

#### F2 · Recibo/comprobante de pago
- **Qué es:** al registrar un pago (endpoint `POST /api/cuotas/:id/pagar` ya existe), generar un comprobante PDF y enviarlo por email/WhatsApp.
- **Valor:** profesionaliza la cobranza, da respaldo al socio, reduce reclamos a tesorería.
- **Implementación:** generar PDF en el server con `pdfkit` o una plantilla HTML→PDF. Guardar en Supabase Storage y enviar el link. Reutiliza el flujo de notificación de F1.

#### F5 · Cobro de cuota online con link de Mercado Pago
- **Qué es:** el socio paga su cuota desde el celular con un link, sin ir presencialmente. Ya hay integración MP para alquileres (`/api/alquileres/reservar` + `/api/mp/webhook`); se replica para cuotas.
- **Valor:** convierte la mora en pago con un clic; habilita la cobranza remota; es prerequisito del portal del socio.
- **Implementación:** nuevo endpoint `POST /api/cuotas/:id/link-pago` que crea una preferencia MP (mismo SDK que ya se usa). Extender el webhook `/api/mp/webhook` para distinguir pago de alquiler vs. cuota y, al acreditarse, marcar la cuota como pagada y el socio "Al día" (la regla de negocio #4 ya existe).

#### F7 · Débito automático / suscripción recurrente
- **Qué es:** la cuota se cobra sola todos los meses con la tarjeta del socio.
- **Valor:** la diferencia entre "perseguir el pago" y "que entre solo". Es el corazón de los SaaS argentinos. Maximiza recurrencia y previsibilidad de caja.
- **Implementación:** **Mercado Pago Suscripciones (preapproval)**. El socio adhiere una vez desde el portal; MP cobra mensual y notifica por webhook. Guardar `preapproval_id` por socio y conciliar contra la emisión de cuotas. Es la evolución natural de F5; arrancar con cuota deportiva (mayor monto).

#### F21 · Facturación electrónica AFIP (factura C)
- **Qué es:** emisión de factura fiscal automática al cobrar.
- **Valor:** cumplimiento fiscal; necesario si el club factura formalmente.
- **Implementación:** servicio AFIP WSFE (web service de facturación). Usar una librería Node (`afip.js`) desde el server. Mayor esfuerzo por certificados y homologación; dejar para fase larga salvo urgencia contable.

### Área: Socios / CRM

#### F6 · Portal del socio
- **Qué es:** login para cada socio donde ve su estado de cuenta, paga, descarga su carnet QR y reserva canchas.
- **Valor:** descarga a recepción/tesorería, da autonomía al socio, es la base de toda la autogestión. Estándar absoluto del mercado.
- **Implementación:** ya hay infraestructura de auth y roles (`/api/auth/login`, `requireRole`). Agregar rol "socio" y un `socio.html` single-file (consistente con la arquitectura actual). El socio se autentica con DNI/email + contraseña o magic link. Reutiliza endpoints `GET /api/socios/:id` y `GET /api/socios/:id/cuotas`.

#### F8 · Grupo familiar (cuentas vinculadas)
- **Qué es:** un titular agrupa a su familia; cuota familiar; un solo pago cubre a todos.
- **Valor:** muy valorado en clubes de barrio (familias enteras son socias). Simplifica cobranza y fideliza al grupo. MatchPoint lo destaca como diferencial.
- **Implementación:** tabla `grupos_familiares` y campo `grupo_id` en `socios`. La emisión de cuota considera el grupo. Cambio de modelo de datos moderado; encararlo cuando el portal ya exista.

### Área: Reservas / Canchas

#### F9 · Reserva de cancha por el socio (autoservicio)
- **Qué es:** el socio logueado reserva y paga su cancha desde el portal, con tarifa de socio.
- **Valor:** más ocupación, menos gestión manual, beneficio tangible de ser socio (tarifa preferencial).
- **Implementación:** la grilla (`/api/alquileres/grilla`) y la reserva con MP (`/api/alquileres/reservar`) ya existen. Falta acoplarlas al login de socio y aplicar tarifa diferenciada socio/no-socio.

#### F10 · Lista de espera
- **Qué es:** si un turno está ocupado, el socio se anota; si se libera, se le avisa.
- **Valor:** captura demanda que hoy se pierde; aumenta ocupación efectiva.
- **Implementación:** tabla `lista_espera`; al cancelarse/liberarse un turno, disparar notificación (reutiliza F1). Bajo esfuerzo una vez que existe el motor de notificaciones.

#### F15 · Bonos / packs de horas
- **Qué es:** el cliente compra un pack (ej. 10 turnos) con descuento y los va consumiendo.
- **Valor:** asegura ingreso anticipado y fideliza al jugador frecuente. Estándar en MatchPoint/Nubapp.
- **Implementación:** tabla `bonos` con saldo de horas por cliente; descontar al reservar. Requiere el portal para que el socio gestione su saldo.

#### F16 · Precios dinámicos por franja/día
- **Qué es:** distinto precio según horario pico/valle, día de semana o demanda. Hoy el precio es fijo por cancha (config en `server.js`).
- **Valor:** Playtomic/Anolla reportan hasta +25% de ocupación con pricing inteligente. Permite llenar horarios muertos con precio bajo y monetizar el pico.
- **Implementación:** mover la config de precios de "fijo por cancha" a una tabla `tarifas` (cancha × franja × día). La grilla ya está; solo cambia de dónde lee el precio. Bajo esfuerzo, buen retorno.

### Área: Comunicación

#### F11 · Comunicados masivos segmentados
- **Qué es:** enviar avisos (cierre por lluvia, cambio de horario, evento, campaña de regularización) a segmentos (morosos, una disciplina, todos).
- **Valor:** canal directo barato; sirve para retención, eventos y recuperación de mora.
- **Implementación:** panel en `admin.html` que arma el segmento (filtros que ya existen en `GET /api/socios`) y dispara por el mismo motor de notificaciones de F1.

### Área: Control de acceso

#### F4 · QR del carnet en el molinete (además de RFID)
- **Qué es:** el socio puede entrar mostrando el QR del carnet digital, no solo con la llave RFID.
- **Valor:** elimina el costo y la pérdida de llaveros; permite que un socio nuevo entre el mismo día sin esperar la llave física.
- **Implementación:** el molinete (`molinete.html`, validación en `/api/acceso/validar`) ya valida estado de cuota. Agregar lectura de QR (cámara/lector 2D) que resuelve al mismo endpoint con el ID del socio en lugar del RFID. La lógica de habilitación se reutiliza tal cual.

### Área: Deportivo

#### F12 · Inscripción a disciplinas/escuelas con cupo y cobro
- **Qué es:** alta a Futsal, Baby Fútbol, Cestoball, etc., con cupos por categoría y cobro de la cuota deportiva asociada.
- **Valor:** ordena las inscripciones (hoy probablemente manuales), controla cupos y vincula la disciplina al cobro. Las disciplinas ya están modeladas (`/api/disciplinas`).
- **Implementación:** tabla `inscripciones` (socio × disciplina × categoría × temporada) con cupo. Conecta inscripción → emisión de cuota deportiva.

#### F13 · Control de asistencia a entrenamientos
- **Qué es:** el profe pasa lista por categoría/día desde su rol.
- **Valor:** seguimiento deportivo, base para detectar deserción temprana y para reportes a familias. El rol "profe" ya existe.
- **Implementación:** tabla `asistencias` (socio × disciplina × fecha × presente). Vista simple para el rol profe en `admin.html`. Opcional: cruzar con accesos del molinete.

#### F17 · Fixtures y calendario deportivo
- **Qué es:** programación de partidos, calendario de la categoría, resultados.
- **Valor:** comunica a familias y socios, da vida al sitio, diferencia frente a competidores que no lo tienen (es el fuerte de Spordle/SportEasy).
- **Implementación:** tablas `partidos`/`fixtures`. Mayor esfuerzo de UI; es "nice to have" deportivo, fase larga.

### Área: Reportería / BI

#### F14 · Reportería y BI
- **Qué es:** ir más allá del dashboard de KPIs: recaudación por disciplina y por mes, evolución de morosidad, ocupación de canchas por franja, socios nuevos vs. bajas, ranking de clientes de alquiler.
- **Valor:** decisiones del dueño basadas en datos (qué disciplina rinde, qué horario llenar, dónde está la fuga de socios). El dashboard actual es básico (`/api/dashboard`).
- **Implementación:** vistas/queries agregadas en Postgres (Supabase soporta SQL completo y vistas materializadas) y nuevos paneles con gráficos en `admin.html` (Chart.js, sin frameworks). Export a CSV/PDF para contabilidad.

### Área: App móvil / Carnet digital

#### F3 · Carnet digital con QR
- **Qué es:** carnet del socio en el celular, con foto, número de socio y QR que codifica su estado (habilitado/inhabilitado según cuota).
- **Valor:** estándar del mercado, refuerza pertenencia, habilita el acceso por QR (F4) y la verificación rápida.
- **Implementación:** página `carnet.html` (o dentro del portal) que renderiza el carnet con los colores del club (verde #005020, rojo #e0282e) y genera el QR con una librería JS. El QR apunta a un endpoint de verificación que devuelve el estado en tiempo real.

#### F18 · App móvil (PWA primero)
- **Qué es:** convertir el portal del socio en una **Progressive Web App** instalable (ícono en el celular, offline básico, notificaciones push), antes de invertir en apps nativas iOS/Android.
- **Valor:** experiencia "app" a costo casi cero, sin App Store ni desarrollo nativo. Los líderes tienen app nativa, pero para este club la PWA cubre el 90% del valor con 10% del esfuerzo.
- **Implementación:** agregar `manifest.json` + service worker al portal de socio. Push con Web Push API. Mantiene la arquitectura HTML single-file.

### Área: Automatizaciones / IA

#### F19 · IA: predicción de morosidad / churn
- **Qué es:** modelo que marca qué socios tienen riesgo de dejar de pagar o darse de baja, para actuar antes.
- **Valor:** retención proactiva; permite focalizar comunicados (F11) en los socios en riesgo.
- **Implementación:** ya hay un asistente de IA (`asistente.js`). Empezar con reglas/score simple sobre el histórico (pagos atrasados, caída de asistencia, no uso de canchas) antes de un modelo ML. Datos provienen de Supabase.

#### F20 · IA: optimización de ocupación de canchas
- **Qué es:** sugerencias de precio/horario para llenar turnos vacíos (complementa F16).
- **Valor:** más ingresos por alquiler con la misma infraestructura.
- **Implementación:** análisis de la serie histórica de alquileres + reglas de pricing. Fase larga, depende de tener pricing dinámico (F16) y BI (F14) primero.

---

## 5. Plan por fases

### Fase 1 — Corto plazo (0-3 meses): "Cobrar bien y que el socio se autogestione"
Foco en recaudación y reducción de morosidad. Todos son Quick Wins o cercanos.

| Feature | Objetivo de negocio |
|---|---|
| F1 · Recordatorios WhatsApp/email | Bajar morosidad (meta: -30/40%) |
| F5 · Link de pago de cuota MP | Cobrar a distancia, recuperar mora |
| F2 · Recibo de pago | Profesionalizar y reducir reclamos |
| F3 · Carnet digital QR | Pertenencia + base de acceso QR |
| F4 · QR en molinete | Eliminar costo de llaveros |
| F6 · Portal del socio (v1: ver estado + pagar) | Descargar a recepción |

**Resultado esperado:** la cuota empieza a cobrarse sola desde el celular, baja la mora y se libera tiempo de recepción. ROI más rápido del roadmap.

### Fase 2 — Medio plazo (3-9 meses): "Recurrencia, autoservicio y datos"

| Feature | Objetivo de negocio |
|---|---|
| F7 · Débito automático recurrente | Previsibilidad de caja, máxima recurrencia |
| F8 · Grupo familiar | Fidelizar familias, simplificar cobro |
| F9 · Reserva de cancha por el socio | Más ocupación, beneficio de ser socio |
| F10 · Lista de espera | Capturar demanda perdida |
| F11 · Comunicados masivos | Retención y campañas de regularización |
| F16 · Precios dinámicos | +ocupación / +ingreso por alquiler |
| F12 · Inscripción a disciplinas con cobro | Ordenar inscripciones, controlar cupos |
| F13 · Asistencia a entrenamientos | Seguimiento deportivo, detectar deserción |
| F14 · Reportería / BI | Decisiones del dueño con datos |

**Resultado esperado:** sistema comparable a los SaaS argentinos líderes en cobranza y autogestión, con datos para decidir.

### Fase 3 — Largo plazo (9-18 meses): "Diferenciación y escala"

| Feature | Objetivo de negocio |
|---|---|
| F18 · PWA instalable + push | Experiencia "app" a bajo costo |
| F15 · Bonos/packs de horas | Ingreso anticipado, fidelización |
| F17 · Fixtures y calendario deportivo | Diferencial deportivo, vida en el sitio |
| F19 · IA: predicción de morosidad/churn | Retención proactiva |
| F20 · IA: optimización de ocupación | Maximizar ingreso por alquiler |
| F21 · Facturación electrónica AFIP | Cumplimiento fiscal |
| F22 · Tienda / cobro de eventos y kiosco | Nuevas líneas de ingreso |

**Resultado esperado:** un sistema que iguala a los líderes globales en autogestión y los supera en cercanía (WhatsApp, familia, club de barrio), con IA aplicada al ingreso.

---

## 6. Riesgos y dependencias

- **WhatsApp Business API** requiere aprobación de Meta y plantillas pre-aprobadas: iniciar el trámite cuanto antes (bloquea F1/F11). Como puente, se puede arrancar solo con **email** (Resend/Brevo, sin trámite) y sumar WhatsApp después.
- **Mercado Pago Suscripciones (F7)** exige cuenta MP en regla y conciliación cuidadosa con la emisión de cuotas para evitar doble cobro.
- **AFIP (F21)** tiene curva de homologación (certificados, ambiente de testing): no bloquear el roadmap de cobranza por esto.
- **Supabase Free se pausa** por inactividad (según notas de operaciones): los crons de notificación deben tolerar el cold start o conviene plan pago antes de automatizar cobranza crítica.
- **Datos sin acentos** (regla del proyecto, ILIKE no es accent-insensitive): mantener al cargar nombres y al armar segmentos para comunicados.
- **Arquitectura:** mantener server.js + HTML single-file y Supabase, sin frameworks de front, como pide el CLAUDE.md del proyecto.

---

## 7. Fuentes consultadas

- [Playtomic Manager](https://playtomic.com/playtomic-manager) — reservas, actividades, pagos, analítica, chat
- [Sportclubby — for clubs](https://www.sportclubby.com/en/for-clubs) — memberships, bookings, accounting, messaging
- [TPC MatchPoint](https://tpcmatchpoint.com/index.html) — abonos, unidad familiar, partidas por nivel, academias
- [Nubapp](https://www.nubapp.com/es/) — control de accesos, reservas, pagos, abonos/bonos, comunicación
- [Spordle](https://www.spordle.com/index.php/en/) y [SportEasy](https://www.sporteasy.net/en/) — fixtures, asistencia, convocatorias, planteles
- [CuotaQ](https://www.cuotaq.com/es-AR/) — carnet QR, recordatorios WhatsApp/email, reducción de morosidad
- [PortalSocios](https://portalsocios.com/software-gestion-club-deportivo.php), [Go Club](https://goclub.com.ar/), [ClubFlex](https://clubflex.com.ar/), [NexoSmart](https://www.nexosmart.com.ar/), [DigitalClub](https://tindat-technologies.com.ar/digitalclub/) — portal del socio, débito automático, grupos familiares, credenciales digitales
- [Anolla — best sports software 2026](https://anolla.com/en/best-sports-software) — pricing dinámico, listas de espera inteligentes, analítica predictiva de ocupación
