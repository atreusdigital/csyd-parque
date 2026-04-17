/**
 * Asistente IA para CSyD Parque.
 * Usa Claude Opus 4.7 con tool use para consultar la DB de Supabase y
 * responder preguntas de admin (socios, cuotas, finanzas, accesos).
 */

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { betaZodTool } = require('@anthropic-ai/sdk/helpers/beta/zod');
const { z } = require('zod');
const { supabase } = require('./db');

const anthropic = new Anthropic();
const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────

function fechaEdad(edad, offsetDays = 0) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - edad);
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function aplicarFiltrosSocios(q, f) {
  if (f.categoria) q = q.eq('categoria', f.categoria);
  if (f.estado_cuota) q = q.eq('estado_cuota', f.estado_cuota);
  if (f.genero) q = q.eq('genero', f.genero);
  if (f.edad_min !== undefined) q = q.lte('fecha_nacimiento', fechaEdad(f.edad_min));
  if (f.edad_max !== undefined) q = q.gte('fecha_nacimiento', fechaEdad(f.edad_max + 1, 1));
  // disciplina se filtra post-query (Supabase JSONB contains tiene quirks)
  return q;
}

function filtrarPorDisciplina(socios, disciplina) {
  if (!disciplina) return socios;
  return socios.filter(s => Array.isArray(s.disciplinas) && s.disciplinas.includes(disciplina));
}

// ─── Tools ───────────────────────────────────────────────

const filtrosSocioSchema = z.object({
  categoria: z.enum(['Activo', 'Cadete', 'Vitalicio', 'Familiar']).optional()
    .describe('Categoria del socio'),
  estado_cuota: z.enum(['Al dia', 'Moroso', 'Suspendido']).optional()
    .describe('Estado de cuota (DB value: "Al dia" sin tilde). Nota: en UI se muestra "Activo" por "Al dia" y "De Baja" cuando activo=false'),
  disciplina: z.enum(['Futsal', 'Baby Futbol', 'Cestoball', 'Futbol Femenino', 'Newcom']).optional()
    .describe('Filtra socios que practican esta disciplina'),
  genero: z.enum(['F', 'M', 'O']).optional()
    .describe('Genero: F=femenino, M=masculino, O=otro'),
  edad_min: z.number().int().min(0).max(120).optional()
    .describe('Edad minima inclusiva'),
  edad_max: z.number().int().min(0).max(120).optional()
    .describe('Edad maxima inclusiva'),
});

const contarSocios = betaZodTool({
  name: 'contar_socios',
  description: 'Cuenta socios activos del club con filtros opcionales combinables. ' +
    'Ejemplos de uso: "cuantos socios hay", "cuantos morosos", "cuantos de +30 anios", ' +
    '"cuantas mujeres juegan futbol femenino", "cuantos cadetes hacen cestoball".',
  inputSchema: filtrosSocioSchema,
  run: async (filtros) => {
    const cols = filtros.disciplina ? 'id, disciplinas' : 'id';
    let q = supabase.from('socios').select(cols).eq('activo', true);
    q = aplicarFiltrosSocios(q, filtros);
    const { data, error } = await q;
    if (error) return JSON.stringify({ error: error.message || 'query error' });
    const filtrados = filtrarPorDisciplina(data || [], filtros.disciplina);
    return JSON.stringify({ cantidad: filtrados.length, filtros });
  },
});

const listarSocios = betaZodTool({
  name: 'listar_socios',
  description: 'Lista socios con sus datos. Usa esto cuando te pidan ver a los socios, ' +
    'no solo contarlos. Retorna nombre, dni, rfid, categoria, estado_cuota, edad, disciplinas, telefono.',
  inputSchema: filtrosSocioSchema.extend({
    limit: z.number().int().min(1).max(100).default(20)
      .describe('Cuantos socios devolver (max 100)'),
  }),
  run: async ({ limit, ...filtros }) => {
    let q = supabase.from('socios')
      .select('id, nombre, dni, rfid, categoria, estado_cuota, fecha_nacimiento, disciplinas, telefono, saldo, genero')
      .eq('activo', true);
    q = aplicarFiltrosSocios(q, filtros);
    // Si hay filtro de disciplina pedimos sin limit y filtramos en JS
    const { data, error } = await (filtros.disciplina ? q.order('nombre') : q.order('nombre').limit(limit));
    if (error) return JSON.stringify({ error: error.message });

    const filtrados = filtrarPorDisciplina(data || [], filtros.disciplina).slice(0, limit);
    const hoy = new Date();
    const socios = filtrados.map(s => {
      const nac = s.fecha_nacimiento ? new Date(s.fecha_nacimiento) : null;
      const edad = nac ? Math.floor((hoy - nac) / (365.25 * 24 * 3600 * 1000)) : null;
      return { ...s, edad };
    });
    return JSON.stringify({ cantidad: socios.length, socios });
  },
});

const resumenFinanzas = betaZodTool({
  name: 'resumen_finanzas',
  description: 'Devuelve ingresos, gastos, balance y desglose por categoria. ' +
    'Opcionalmente acepta rango de fechas.',
  inputSchema: z.object({
    fecha_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
      .describe('ISO date YYYY-MM-DD'),
    fecha_hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
      .describe('ISO date YYYY-MM-DD'),
  }),
  run: async ({ fecha_desde, fecha_hasta }) => {
    const filterRange = (q) => {
      if (fecha_desde) q = q.gte('fecha', fecha_desde);
      if (fecha_hasta) q = q.lte('fecha', fecha_hasta);
      return q;
    };
    const [ing, gas] = await Promise.all([
      filterRange(supabase.from('ingresos').select('monto, categoria')),
      filterRange(supabase.from('gastos').select('monto, categoria')),
    ]);
    if (ing.error) return JSON.stringify({ error: ing.error.message });
    if (gas.error) return JSON.stringify({ error: gas.error.message });

    const sum = arr => arr.reduce((a, r) => a + Number(r.monto), 0);
    const byCat = arr => {
      const m = new Map();
      arr.forEach(r => m.set(r.categoria, (m.get(r.categoria) || 0) + Number(r.monto)));
      return [...m.entries()].map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total);
    };
    const totalIng = sum(ing.data);
    const totalGas = sum(gas.data);
    return JSON.stringify({
      rango: { desde: fecha_desde ?? null, hasta: fecha_hasta ?? null },
      ingresos_total: totalIng,
      gastos_total: totalGas,
      balance: totalIng - totalGas,
      ingresos_por_categoria: byCat(ing.data),
      gastos_por_categoria: byCat(gas.data),
    });
  },
});

const statsAccesos = betaZodTool({
  name: 'stats_accesos',
  description: 'Estadisticas de accesos al molinete: total, OK, denegados. ' +
    'Opcionalmente por fecha (default: hoy).',
  inputSchema: z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
      .describe('Fecha ISO YYYY-MM-DD. Si se omite, usa hoy.'),
  }),
  run: async ({ fecha }) => {
    const f = fecha || new Date().toISOString().split('T')[0];
    const gte = `${f}T00:00:00`;
    const lt = `${f}T23:59:59.999`;

    const [totalR, okR, denR] = await Promise.all([
      supabase.from('accesos').select('*', { count: 'exact', head: true })
        .gte('timestamp', gte).lt('timestamp', lt),
      supabase.from('accesos').select('*', { count: 'exact', head: true })
        .gte('timestamp', gte).lt('timestamp', lt).eq('resultado', 'OK'),
      supabase.from('accesos').select('*', { count: 'exact', head: true })
        .gte('timestamp', gte).lt('timestamp', lt).eq('resultado', 'DENEGADO'),
    ]);

    return JSON.stringify({
      fecha: f,
      total: totalR.count ?? 0,
      ok: okR.count ?? 0,
      denegados: denR.count ?? 0,
    });
  },
});

const listarMorosos = betaZodTool({
  name: 'listar_morosos',
  description: 'Lista socios morosos ordenados por saldo (los que mas deben primero). ' +
    'Incluye nombre, telefono, email, saldo adeudado.',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(50),
  }),
  run: async ({ limit }) => {
    const { data, error } = await supabase
      .from('socios')
      .select('id, nombre, rfid, telefono, email, saldo, estado_cuota')
      .eq('activo', true)
      .or('estado_cuota.eq.Moroso,saldo.lt.0')
      .order('saldo', { ascending: true })
      .limit(limit);
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ cantidad: data.length, morosos: data });
  },
});

// ─── System Prompt ────────────────────────────────────────

const SYSTEM_PROMPT = `Sos el asistente IA del Club Social y Deportivo Parque.
Tu trabajo es ayudar a los administradores del club (recepcion, tesoreria, comision directiva)
a responder preguntas sobre el estado del club: socios, cuotas, finanzas, accesos.

REGLAS:
- Siempre usa las tools disponibles para obtener datos reales. Nunca inventes numeros.
- Responde en espaniol rioplatense, conciso, amable, tono informal pero profesional.
- Formatea numeros grandes con separador de miles ($1.234.567).
- Cuando listes socios, dame nombre + dato relevante (edad, saldo, etc) en una linea cada uno.
- Si la pregunta es ambigua, pedi aclaracion antes de usar tools.
- Si no encontras datos relevantes, decilo explicitamente.

CONTEXTO DEL CLUB:
- Nombre: Club Social y Deportivo Parque (colores: verde #005020, rojo #e0282e, blanco).
- Tiene 3 canchas: Jose Batista (#1), Ramon Maddoni (#2), Cesar La Paglia (#3).
- Disciplinas y reglas de edad/genero:
    · Cestoball — mujeres, 4 a 80 anios.
    · Baby Futbol (escuela de futbol) — varones, 4 a 13 anios.
    · Futsal — varones, 7 a 80 anios.
    · Futbol Femenino — mujeres, 4 a 80 anios.
    · Newcom — mixto (M/F), 50+ anios.
- Categorias de socio: Activo, Cadete (menor de 18 anios), Vitalicio, Familiar.
- Estados (UI): "Activo" (cuota al dia), "Moroso", "De Baja" (baja logica, activo=false).
  En DB: estado_cuota puede ser 'Al dia', 'Moroso', 'Suspendido'. El campo activo (bool) distingue socios de alta vs de baja.
- Los vitalicios no pagan cuota.
- Un solo molinete en la entrada principal con llaves RFID EM4100 (10 digitos).
- Genero almacenado como F (femenino), M (masculino), O (otro).

Hoy es ${new Date().toISOString().split('T')[0]}.`;

// ─── Endpoint ─────────────────────────────────────────────

router.post('/asistente', async (req, res) => {
  const { pregunta, historial = [] } = req.body;
  if (!pregunta || typeof pregunta !== 'string') {
    return res.status(400).json({ error: 'Falta "pregunta" (string)' });
  }

  const messages = [
    ...historial,
    { role: 'user', content: pregunta },
  ];

  try {
    const finalMessage = await anthropic.beta.messages.toolRunner({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      tools: [contarSocios, listarSocios, resumenFinanzas, statsAccesos, listarMorosos],
      messages,
    });

    const respuesta = finalMessage.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    res.json({
      respuesta: respuesta || '(sin respuesta)',
      nuevo_historial: [
        ...messages,
        { role: 'assistant', content: finalMessage.content },
      ],
      usage: finalMessage.usage,
    });
  } catch (e) {
    console.error('[asistente]', e);
    const status = e instanceof Anthropic.RateLimitError ? 429
                 : e instanceof Anthropic.AuthenticationError ? 401
                 : 500;
    res.status(status).json({ error: e.message });
  }
});

module.exports = router;
