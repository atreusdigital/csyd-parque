/**
 * =========================================================
 *  CSyD PARQUE — API REST + Frontend
 *  Stack: Node.js + Express + Supabase (Postgres)
 *
 *  npm install && npm start
 *  → http://localhost:3000
 * =========================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { supabase } = require('./db');
const asistenteRouter = require('./asistente');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// /admin → panel de gestión (admin.html)
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Asistente IA
app.use('/api', asistenteRouter);

// ═══════════════════════════════════════════════════════════
//  VALIDAR ACCESO (endpoint para el molinete)
// ═══════════════════════════════════════════════════════════
app.post('/api/acceso/validar', async (req, res) => {
  const { rfid, carnet, puerta, ip_placa } = req.body;
  const tag = rfid || carnet;
  if (!tag) return res.status(400).json({ resultado: 'ERROR', motivo: 'Falta campo "rfid"' });

  const { data: socio, error } = await supabase
    .from('socios')
    .select('*')
    .eq('rfid', tag)
    .eq('activo', true)
    .maybeSingle();

  if (error) return res.status(500).json({ resultado: 'ERROR', motivo: error.message });

  let resultado, motivo;
  if (!socio) {
    resultado = 'DENEGADO';
    motivo = 'Tag RFID no registrado en padrón';
  } else if (socio.estado_cuota === 'Moroso') {
    resultado = 'DENEGADO';
    motivo = `Cuota adeudada (saldo: $${Math.abs(socio.saldo).toLocaleString('es-AR')})`;
  } else if (socio.estado_cuota === 'Suspendido') {
    resultado = 'DENEGADO';
    motivo = 'Socio suspendido — contactar administración';
  } else {
    resultado = 'OK';
    motivo = `Acceso habilitado — ${socio.categoria}`;
  }

  // Log de acceso (no bloquea respuesta al molinete)
  supabase.from('accesos').insert({
    rfid: tag,
    socio_id: socio?.id ?? null,
    puerta: puerta || 'Molinete Principal',
    resultado,
    motivo,
    ip_placa: ip_placa || null,
  }).then(({ error }) => {
    if (error) console.error('[accesos.insert]', error.message);
  });

  res.json({
    resultado,
    motivo,
    accion: resultado === 'OK' ? 'ABRIR' : 'MANTENER_CERRADO',
    socio: socio ? { id: socio.id, nombre: socio.nombre, categoria: socio.categoria, foto_url: socio.foto_url } : null,
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════
//  PADRÓN PARA SYNC OFFLINE (PC local del club)
// ═══════════════════════════════════════════════════════════
app.get('/api/acceso/padron', async (req, res) => {
  const { data, error } = await supabase
    .from('socios')
    .select('rfid, nombre, categoria, estado_cuota')
    .eq('activo', true);
  if (error) return res.status(500).json({ error: error.message });

  const padron = data.map(s => ({
    rfid: s.rfid,
    habilitado: s.estado_cuota !== 'Moroso' && s.estado_cuota !== 'Suspendido',
    nombre: s.nombre,
    categoria: s.categoria,
  }));

  res.json({
    total: padron.length,
    habilitados: padron.filter(p => p.habilitado).length,
    bloqueados: padron.filter(p => !p.habilitado).length,
    actualizado: new Date().toISOString(),
    padron,
  });
});

// ═══════════════════════════════════════════════════════════
//  SOCIOS CRUD
// ═══════════════════════════════════════════════════════════
app.get('/api/socios', async (req, res) => {
  const { estado, categoria, buscar, genero } = req.query;
  let q = supabase.from('socios').select('*');

  // Mapeo de estado UI → DB
  if (estado === 'De Baja') {
    q = q.eq('activo', false);
  } else {
    q = q.eq('activo', true);
    if (estado === 'Activo') q = q.eq('estado_cuota', 'Al dia');
    else if (estado === 'Moroso') q = q.eq('estado_cuota', 'Moroso');
    else if (estado === 'Suspendido') q = q.eq('estado_cuota', 'Suspendido');
  }
  if (categoria) q = q.eq('categoria', categoria);
  if (genero) q = q.eq('genero', genero);
  if (buscar) {
    const term = String(buscar).replace(/[,%]/g, '');
    q = q.or(`nombre.ilike.%${term}%,dni.ilike.%${term}%,rfid.ilike.%${term}%`);
  }

  const { data, error } = await q.order('nombre');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, socios: data });
});

app.get('/api/socios/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('socios')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Socio no encontrado' });
  res.json(data);
});

app.post('/api/socios', async (req, res) => {
  const { nombre, dni, rfid, categoria, telefono, email, disciplinas, genero, fecha_nacimiento } = req.body;
  if (!nombre || !dni || !rfid) return res.status(400).json({ error: 'Campos requeridos: nombre, dni, rfid' });

  const { data: dupe } = await supabase
    .from('socios')
    .select('id')
    .or(`dni.eq.${dni},rfid.eq.${rfid}`)
    .eq('activo', true)
    .maybeSingle();
  if (dupe) return res.status(409).json({ error: 'DNI o RFID ya existe en el padrón' });

  const row = {
    nombre, dni, rfid,
    categoria: categoria || 'Activo',
    telefono: telefono || '',
    email: email || '',
    disciplinas: Array.isArray(disciplinas) ? disciplinas : [],
  };
  if (genero) row.genero = genero;
  if (fecha_nacimiento) row.fecha_nacimiento = fecha_nacimiento;

  const { data, error } = await supabase.from('socios').insert(row).select().single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'DNI o RFID ya existe en el padrón' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

app.put('/api/socios/:id', async (req, res) => {
  const allowed = ['nombre','dni','rfid','categoria','estado_cuota','saldo','telefono','email','disciplinas','foto_url','activo','genero','fecha_nacimiento'];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Sin campos válidos' });

  const { data, error } = await supabase
    .from('socios')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Socio no encontrado' });
  res.json(data);
});

app.delete('/api/socios/:id', async (req, res) => {
  const { error } = await supabase
    .from('socios')
    .update({ activo: false })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ mensaje: 'Socio dado de baja' });
});

// ═══════════════════════════════════════════════════════════
//  CUOTAS
// ═══════════════════════════════════════════════════════════
app.post('/api/cuotas/emitir', async (req, res) => {
  const { periodo, monto_activo, monto_cadete, monto_familiar, fecha_venc } = req.body;
  if (!periodo) return res.status(400).json({ error: 'Falta "periodo"' });

  const { data: socios, error } = await supabase
    .from('socios')
    .select('id, categoria')
    .eq('activo', true)
    .neq('categoria', 'Vitalicio');
  if (error) return res.status(500).json({ error: error.message });

  const montos = { Activo: monto_activo || 18000, Cadete: monto_cadete || 12000, Familiar: monto_familiar || 52000 };
  const venc = fecha_venc || `${periodo}-10`;

  const rows = socios.map(s => ({
    socio_id: s.id,
    periodo,
    monto: montos[s.categoria] || montos.Activo,
    fecha_venc: venc,
  }));

  const { data, error: insErr } = await supabase
    .from('cuotas')
    .upsert(rows, { onConflict: 'socio_id,periodo', ignoreDuplicates: true })
    .select();
  if (insErr) return res.status(500).json({ error: insErr.message });

  res.json({ mensaje: `${data.length} cuotas emitidas para ${periodo}` });
});

app.post('/api/cuotas/:id/pagar', async (req, res) => {
  const { monto, metodo_pago } = req.body;

  const { data: cuota, error: e1 } = await supabase
    .from('cuotas').select('*').eq('id', req.params.id).maybeSingle();
  if (e1) return res.status(500).json({ error: e1.message });
  if (!cuota) return res.status(404).json({ error: 'Cuota no encontrada' });

  const nuevo_pagado = Number(cuota.pagado) + Number(monto || cuota.monto);
  const nuevo_estado = nuevo_pagado >= Number(cuota.monto) ? 'pagada' : 'pendiente';

  const { error: e2 } = await supabase
    .from('cuotas')
    .update({
      pagado: nuevo_pagado,
      estado: nuevo_estado,
      fecha_pago: new Date().toISOString().split('T')[0],
      metodo_pago: metodo_pago || 'efectivo',
    })
    .eq('id', cuota.id);
  if (e2) return res.status(500).json({ error: e2.message });

  if (nuevo_estado === 'pagada') {
    const { count } = await supabase
      .from('cuotas')
      .select('*', { count: 'exact', head: true })
      .eq('socio_id', cuota.socio_id)
      .neq('estado', 'pagada')
      .neq('id', cuota.id);

    if ((count || 0) === 0) {
      await supabase.from('socios')
        .update({ estado_cuota: 'Al dia', saldo: 0 })
        .eq('id', cuota.socio_id);
    }
  }

  res.json({ mensaje: 'Pago registrado', nuevo_estado });
});

app.get('/api/socios/:id/cuotas', async (req, res) => {
  const { data, error } = await supabase
    .from('cuotas')
    .select('*')
    .eq('socio_id', req.params.id)
    .order('periodo', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/cuotas/morosos', async (req, res) => {
  const { data, error } = await supabase
    .from('socios')
    .select('id, nombre, rfid, telefono, email, saldo, estado_cuota')
    .eq('activo', true)
    .or('estado_cuota.eq.Moroso,saldo.lt.0')
    .order('saldo', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, morosos: data });
});

// ═══════════════════════════════════════════════════════════
//  FINANZAS
// ═══════════════════════════════════════════════════════════
app.get('/api/ingresos', async (req, res) => {
  const { data, error } = await supabase
    .from('ingresos').select('*').order('fecha', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/ingresos', async (req, res) => {
  const { fecha, concepto, monto, categoria } = req.body;
  if (!concepto || !monto || !categoria) return res.status(400).json({ error: 'Faltan campos' });

  const row = { concepto, monto, categoria };
  if (fecha) row.fecha = fecha;

  const { error } = await supabase.from('ingresos').insert(row);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ mensaje: 'Ingreso registrado' });
});

app.get('/api/gastos', async (req, res) => {
  const { data, error } = await supabase
    .from('gastos').select('*').order('fecha', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/gastos', async (req, res) => {
  const { fecha, concepto, monto, categoria } = req.body;
  if (!concepto || !monto || !categoria) return res.status(400).json({ error: 'Faltan campos' });

  const row = { concepto, monto, categoria };
  if (fecha) row.fecha = fecha;

  const { error } = await supabase.from('gastos').insert(row);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ mensaje: 'Gasto registrado' });
});

app.get('/api/finanzas/resumen', async (req, res) => {
  const [ing, gas] = await Promise.all([
    supabase.from('ingresos').select('monto, categoria'),
    supabase.from('gastos').select('monto, categoria'),
  ]);
  if (ing.error) return res.status(500).json({ error: ing.error.message });
  if (gas.error) return res.status(500).json({ error: gas.error.message });

  const sum = arr => arr.reduce((a, r) => a + Number(r.monto), 0);
  const byCat = arr => {
    const m = new Map();
    arr.forEach(r => m.set(r.categoria, (m.get(r.categoria) || 0) + Number(r.monto)));
    return [...m.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  };

  const totalIng = sum(ing.data);
  const totalGas = sum(gas.data);

  res.json({
    ingresos: totalIng,
    gastos: totalGas,
    balance: totalIng - totalGas,
    gastos_por_cat: byCat(gas.data),
    ingresos_por_cat: byCat(ing.data),
  });
});

// ═══════════════════════════════════════════════════════════
//  ALQUILERES
// ═══════════════════════════════════════════════════════════
app.get('/api/alquileres', async (req, res) => {
  const { fecha, cancha } = req.query;
  let q = supabase.from('alquileres').select('*');
  if (fecha) q = q.eq('fecha', fecha);
  if (cancha) q = q.eq('cancha', cancha);
  const { data, error } = await q.order('fecha').order('hora');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/alquileres', async (req, res) => {
  const { cancha, fecha, hora, cliente, telefono, monto, pagado } = req.body;
  if (!cancha || !fecha || !hora) return res.status(400).json({ error: 'Faltan cancha, fecha u hora' });

  const { data, error } = await supabase
    .from('alquileres')
    .insert({
      cancha, fecha, hora,
      cliente: cliente || '',
      telefono: telefono || '',
      monto: monto || 0,
      pagado: !!pagado,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Turno ya reservado' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

app.put('/api/alquileres/:id', async (req, res) => {
  const allowed = ['cancha','fecha','hora','cliente','telefono','monto','pagado','estado'];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Sin campos válidos' });

  const { data, error } = await supabase
    .from('alquileres')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(data);
});

app.delete('/api/alquileres/:id', async (req, res) => {
  const { error } = await supabase.from('alquileres').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ mensaje: 'Reserva cancelada' });
});

// ═══════════════════════════════════════════════════════════
//  LOG DE ACCESOS
// ═══════════════════════════════════════════════════════════
app.get('/api/accesos', async (req, res) => {
  const { fecha, resultado, limit } = req.query;

  let q = supabase
    .from('accesos')
    .select('*, socios(nombre)')
    .order('timestamp', { ascending: false })
    .limit(parseInt(limit) || 100);

  if (resultado) q = q.eq('resultado', resultado);
  if (fecha) {
    q = q.gte('timestamp', `${fecha}T00:00:00`).lt('timestamp', `${fecha}T23:59:59.999`);
  }

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  // Aplanar: { ...acceso, nombre: "..." }
  const flat = data.map(({ socios, ...rest }) => ({ ...rest, nombre: socios?.nombre || null }));
  res.json(flat);
});

app.get('/api/accesos/stats', async (req, res) => {
  const hoy = new Date().toISOString().split('T')[0];
  const gte = `${hoy}T00:00:00`;
  const lt = `${hoy}T23:59:59.999`;

  const [totalR, okR] = await Promise.all([
    supabase.from('accesos').select('*', { count: 'exact', head: true })
      .gte('timestamp', gte).lt('timestamp', lt),
    supabase.from('accesos').select('*', { count: 'exact', head: true })
      .gte('timestamp', gte).lt('timestamp', lt).eq('resultado', 'OK'),
  ]);

  const total = totalR.count || 0;
  const ok = okR.count || 0;
  res.json({ total, ok, denegados: total - ok });
});

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
app.get('/api/dashboard', async (req, res) => {
  const [totalQ, alDiaQ, morososQ, ingQ, gasQ] = await Promise.all([
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true).eq('estado_cuota', 'Al dia'),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true).eq('estado_cuota', 'Moroso'),
    supabase.from('ingresos').select('monto'),
    supabase.from('gastos').select('monto'),
  ]);

  const totalIng = (ingQ.data || []).reduce((a, r) => a + Number(r.monto), 0);
  const totalGas = (gasQ.data || []).reduce((a, r) => a + Number(r.monto), 0);

  res.json({
    socios: {
      total: totalQ.count || 0,
      al_dia: alDiaQ.count || 0,
      morosos: morososQ.count || 0,
    },
    finanzas: {
      ingresos: totalIng,
      gastos: totalGas,
      balance: totalIng - totalGas,
    },
  });
});

// ═══════════════════════════════════════════════════════════
//  PUERTAS
// ═══════════════════════════════════════════════════════════
app.get('/api/puertas', async (req, res) => {
  const { data, error } = await supabase.from('puertas').select('*').eq('activa', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ═══════════════════════════════════════════════════════════
//  CANCHAS (catalogo)
// ═══════════════════════════════════════════════════════════
app.get('/api/canchas', async (req, res) => {
  const { data, error } = await supabase
    .from('canchas')
    .select('*')
    .eq('activa', true)
    .order('numero');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ═══════════════════════════════════════════════════════════
//  DISCIPLINAS (catalogo)
// ═══════════════════════════════════════════════════════════
app.get('/api/disciplinas', async (req, res) => {
  const { data, error } = await supabase
    .from('disciplinas')
    .select('*')
    .eq('activa', true)
    .order('nombre');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ═══════════════════════════════════════════════════════════
//  HEALTH
// ═══════════════════════════════════════════════════════════
app.get('/api/health', async (req, res) => {
  const { count, error } = await supabase
    .from('socios')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);

  res.json({
    status: error ? 'DEGRADED' : 'OK',
    club: 'Club Social y Deportivo Parque',
    db: 'Supabase Postgres',
    uptime: process.uptime(),
    socios_activos: count || 0,
    error: error?.message,
    timestamp: new Date().toISOString(),
  });
});

// ─── ARRANQUE ───────────────────────────────────────────
// Solo escuchamos puerto si nos ejecutan como script standalone (node server.js).
// En Vercel este archivo se importa como módulo y el handler en /api/index.js se encarga.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  CSyD PARQUE — Sistema de Gestión                        ║
║  Backend: Express + Supabase Postgres                    ║
║                                                          ║
║  Frontend: http://localhost:${PORT}                          ║
║  Health:   http://localhost:${PORT}/api/health               ║
║  Molinete: POST http://localhost:${PORT}/api/acceso/validar  ║
╚══════════════════════════════════════════════════════════╝
  `);
  });
}

module.exports = app;
