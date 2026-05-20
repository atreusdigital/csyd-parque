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
const crypto = require('crypto');
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
//  AUTH ADMIN (token firmado estilo JWT)
// ═══════════════════════════════════════════════════════════
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'parque1949';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-secret-change-me';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 h

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString();
}
function signToken(payload) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS }));
  const sig = b64url(crypto.createHmac('sha256', ADMIN_SECRET).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = b64url(crypto.createHmac('sha256', ADMIN_SECRET).update(`${h}.${p}`).digest());
  if (s !== expected) return null;
  try {
    const payload = JSON.parse(b64urlDecode(p));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function requireAdmin(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.replace(/^Bearer\s+/i, '').trim();
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'No autorizado' });
  req.admin = payload;
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  res.json({ token: signToken({ role: 'admin' }), expiresAt: Date.now() + TOKEN_TTL_MS });
});

app.get('/api/admin/check', requireAdmin, (req, res) => {
  res.json({ ok: true, exp: req.admin.exp, rol: req.admin.rol || 'admin', nombre: req.admin.nombre || 'Administrador' });
});

// ═══════════════════════════════════════════════════════════
//  USUARIOS, ROLES Y PERMISOS
// ═══════════════════════════════════════════════════════════
const ROLES_VALIDOS = ['admin', 'tesoreria', 'recepcion', 'profe'];

// Hashing de contraseñas con scrypt nativo (sin dependencias extra)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(calc, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Middleware: exige token válido + rol dentro de la lista
function requireRole(...roles) {
  return (req, res, next) => {
    const hdr = req.headers.authorization || '';
    const payload = verifyToken(hdr.replace(/^Bearer\s+/i, '').trim());
    if (!payload) return res.status(401).json({ error: 'No autorizado' });
    // Compat: tokens viejos guardaban 'role'; si no hay rol reconocido, asumir admin (token firmado válido)
    const rol = payload.rol || payload.role || 'admin';
    if (roles.length && !roles.includes(rol)) {
      return res.status(403).json({ error: 'No tenés permiso para esta acción' });
    }
    req.admin = { ...payload, rol };
    next();
  };
}
// Escritura operativa: todos menos el profe (que es solo lectura)
const requireWrite = requireRole('admin', 'tesoreria', 'recepcion');

// Login por usuario + contraseña (con admin maestro de respaldo)
app.post('/api/auth/login', async (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) return res.status(400).json({ error: 'Faltan usuario y contraseña' });

  // Admin maestro: usuario "admin" + la clave histórica del sistema
  if (String(usuario).trim().toLowerCase() === 'admin' && password === ADMIN_PASSWORD) {
    return res.json({
      token: signToken({ rol: 'admin', nombre: 'Administrador', usuario: 'admin', master: true }),
      expiresAt: Date.now() + TOKEN_TTL_MS, rol: 'admin', nombre: 'Administrador',
    });
  }

  // Usuarios reales (tabla usuarios)
  const { data: u, error } = await supabase
    .from('usuarios').select('*').eq('usuario', String(usuario).trim()).eq('activo', true).maybeSingle();
  if (error) {
    // La tabla usuarios puede no existir todavía (migración 009 pendiente): degradar a 401 limpio.
    console.error('[auth/login] tabla usuarios:', error.message);
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  if (!u || !verifyPassword(password, u.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  res.json({
    token: signToken({ id: u.id, rol: u.rol, nombre: u.nombre, usuario: u.usuario }),
    expiresAt: Date.now() + TOKEN_TTL_MS, rol: u.rol, nombre: u.nombre,
  });
});

app.get('/api/usuarios', requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('usuarios').select('id, nombre, usuario, rol, activo, created_at').order('nombre');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, usuarios: data });
});

app.post('/api/usuarios', requireRole('admin'), async (req, res) => {
  const { nombre, usuario, password, rol } = req.body || {};
  if (!nombre || !usuario || !password) return res.status(400).json({ error: 'Faltan nombre, usuario y contraseña' });
  if (rol && !ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  if (String(usuario).trim().toLowerCase() === 'admin') return res.status(400).json({ error: 'El usuario "admin" está reservado' });

  const row = {
    nombre, usuario: String(usuario).trim(),
    password_hash: hashPassword(password),
    rol: rol || 'recepcion', activo: true,
  };
  const { data, error } = await supabase.from('usuarios').insert(row).select('id, nombre, usuario, rol, activo').single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

app.put('/api/usuarios/:id', requireRole('admin'), async (req, res) => {
  const { nombre, rol, activo, password } = req.body || {};
  if (rol && !ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  const updates = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (rol !== undefined) updates.rol = rol;
  if (activo !== undefined) updates.activo = !!activo;
  if (password) updates.password_hash = hashPassword(password);
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Sin cambios' });

  const { data, error } = await supabase
    .from('usuarios').update(updates).eq('id', req.params.id).select('id, nombre, usuario, rol, activo').maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(data);
});

app.delete('/api/usuarios/:id', requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ mensaje: 'Usuario dado de baja' });
});

// ═══════════════════════════════════════════════════════════
//  CONFIG CANCHAS / PRECIOS
// ═══════════════════════════════════════════════════════════
const CANCHAS_CFG = [
  { id: 'Jose Batista',    numero: 1, nombre: 'José Batista',    tipo: 'Fútbol infantil',         precio: 90000  },
  { id: 'Ramon Maddoni',   numero: 2, nombre: 'Ramón Maddoni',   tipo: 'Fútbol infantil',         precio: 90000  },
  { id: 'Cesar La Paglia', numero: 3, nombre: 'César La Paglia', tipo: 'Futsal reglamentaria',    precio: 150000 },
];
const HORAS_ALQUILER = [21, 22]; // 21-22 y 22-23
const DIAS_A_MOSTRAR = 7;

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
  } else if (socio.beca) {
    resultado = 'OK';
    motivo = 'Acceso habilitado — Becado';
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
    socio: socio ? { id: socio.id, nombre: socio.nombre, categoria: socio.categoria, foto_url: socio.foto_url, disciplinas: Array.isArray(socio.disciplinas) ? socio.disciplinas : [] } : null,
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════
//  PADRÓN PARA SYNC OFFLINE (PC local del club)
// ═══════════════════════════════════════════════════════════
app.get('/api/acceso/padron', async (req, res) => {
  const { data, error } = await supabase
    .from('socios')
    .select('*')
    .eq('activo', true);
  if (error) return res.status(500).json({ error: error.message });

  const padron = data.map(s => ({
    rfid: s.rfid,
    habilitado: !!s.beca || (s.estado_cuota !== 'Moroso' && s.estado_cuota !== 'Suspendido'),
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

app.post('/api/socios', requireWrite, async (req, res) => {
  const { nombre, dni, rfid, categoria, estado_cuota, telefono, email, disciplinas, genero, fecha_nacimiento, beca } = req.body;
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
    estado_cuota: estado_cuota || 'Al dia',
    telefono: telefono || '',
    email: email || '',
    disciplinas: Array.isArray(disciplinas) ? disciplinas : [],
  };
  if (genero) row.genero = genero;
  if (fecha_nacimiento) row.fecha_nacimiento = fecha_nacimiento;
  if (beca !== undefined) row.beca = !!beca;

  let { data, error } = await supabase.from('socios').insert(row).select().single();
  if (error && 'beca' in row && /beca/i.test(error.message || '')) {
    delete row.beca; // columna beca aún no migrada (011): seguir sin ella
    ({ data, error } = await supabase.from('socios').insert(row).select().single());
  }
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'DNI o RFID ya existe en el padrón' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

app.put('/api/socios/:id', requireWrite, async (req, res) => {
  const allowed = ['nombre','dni','rfid','categoria','estado_cuota','saldo','telefono','email','disciplinas','foto_url','activo','genero','fecha_nacimiento','beca'];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Sin campos válidos' });

  let { data, error } = await supabase
    .from('socios').update(updates).eq('id', req.params.id).select().maybeSingle();
  if (error && 'beca' in updates && /beca/i.test(error.message || '')) {
    delete updates.beca; // columna beca aún no migrada (011): seguir sin ella
    ({ data, error } = await supabase.from('socios').update(updates).eq('id', req.params.id).select().maybeSingle());
  }
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Socio no encontrado' });
  res.json(data);
});

app.delete('/api/socios/:id', requireWrite, async (req, res) => {
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
app.post('/api/cuotas/emitir', requireWrite, async (req, res) => {
  const { periodo, fecha_venc } = req.body;
  if (!periodo) return res.status(400).json({ error: 'Falta "periodo"' });

  // Cuota social (config), con default si la tabla aún no existe
  let cuotaSocial = 1000;
  const { data: cfg } = await supabase.from('config').select('valor').eq('clave', 'cuota_social').maybeSingle();
  if (cfg && cfg.valor != null) cuotaSocial = Number(cfg.valor) || 1000;

  // Precio (cuota deportiva) por disciplina
  const precio = {};
  const { data: discs } = await supabase.from('disciplinas').select('*').eq('activa', true);
  (discs || []).forEach(d => { precio[d.nombre] = Number(d.precio) || 48000; });

  // Socios activos con sus disciplinas
  const { data: socios, error } = await supabase
    .from('socios').select('*').eq('activo', true);
  if (error) return res.status(500).json({ error: error.message });

  const venc = fecha_venc || `${periodo}-10`;
  const rows = socios.filter(s => !s.beca).map(s => {
    const ds = Array.isArray(s.disciplinas) ? s.disciplinas : [];
    const monto = cuotaSocial + ds.reduce((a, d) => a + (precio[d] || 0), 0);
    return { socio_id: s.id, periodo, monto, fecha_venc: venc };
  });

  const { data, error: insErr } = await supabase
    .from('cuotas')
    .upsert(rows, { onConflict: 'socio_id,periodo', ignoreDuplicates: true })
    .select();
  if (insErr) return res.status(500).json({ error: insErr.message });

  await recalcularMorosidad();
  res.json({ mensaje: `${rows.length} cuotas emitidas para ${periodo} (social $${cuotaSocial} + disciplinas)` });
});

// ── Recálculo de morosidad con período de gracia ──
async function getGraciaDias() {
  const { data } = await supabase.from('config').select('valor').eq('clave', 'gracia_dias').maybeSingle();
  return (data && Number(data.valor)) || 5;
}
async function recalcularMorosidad() {
  const gracia = await getGraciaDias();
  const hoy = Date.now();
  const [{ data: socios }, { data: cuotas }] = await Promise.all([
    supabase.from('socios').select('id, beca, estado_cuota, saldo').eq('activo', true),
    supabase.from('cuotas').select('socio_id, monto, pagado, fecha_venc').neq('estado', 'pagada'),
  ]);
  const porSocio = {};
  (cuotas || []).forEach(c => { (porSocio[c.socio_id] = porSocio[c.socio_id] || []).push(c); });
  let bloqueados = 0, conDeuda = 0;
  for (const s of (socios || [])) {
    let estado, saldo;
    if (s.beca) { estado = 'Al dia'; saldo = 0; }
    else {
      const impagas = porSocio[s.id] || [];
      const deuda = impagas.reduce((a, c) => a + (Number(c.monto) - Number(c.pagado || 0)), 0);
      const vencida = impagas.some(c => new Date(c.fecha_venc + 'T00:00:00').getTime() + gracia * 86400000 < hoy);
      estado = vencida ? 'Suspendido' : 'Al dia';
      saldo = deuda > 0 ? -deuda : 0;
    }
    if (estado === 'Suspendido') bloqueados++;
    if (saldo < 0) conDeuda++;
    if (s.estado_cuota !== estado || Number(s.saldo) !== saldo) {
      await supabase.from('socios').update({ estado_cuota: estado, saldo }).eq('id', s.id);
    }
  }
  return { bloqueados, conDeuda, gracia };
}
app.post('/api/cuotas/recalcular', requireWrite, async (req, res) => {
  try { const r = await recalcularMorosidad(); res.json({ mensaje: `Estado actualizado · ${r.bloqueados} inhabilitados por mora (gracia ${r.gracia} días)`, ...r }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Resumen de cuotas emitidas por período
app.get('/api/cuotas/resumen', async (req, res) => {
  const { data, error } = await supabase.from('cuotas').select('periodo, monto, pagado, estado, fecha_venc');
  if (error) return res.status(500).json({ error: error.message });
  const map = {};
  (data || []).forEach(c => {
    const p = map[c.periodo] || (map[c.periodo] = { periodo: c.periodo, fecha_venc: c.fecha_venc, cantidad: 0, total: 0, pagadas: 0, pendientes: 0, recaudado: 0 });
    p.cantidad++; p.total += Number(c.monto);
    if (c.estado === 'pagada') { p.pagadas++; p.recaudado += Number(c.pagado || c.monto); }
    else p.pendientes++;
    if (c.fecha_venc) p.fecha_venc = c.fecha_venc;
  });
  res.json({ periodos: Object.values(map).sort((a, b) => b.periodo.localeCompare(a.periodo)) });
});

// Pago a nivel socio: marca sus cuotas impagas como pagadas + ingreso + queda al día
app.post('/api/socios/:id/pagar', requireWrite, async (req, res) => {
  const { monto, metodo_pago, categoria, concepto } = req.body || {};
  const id = req.params.id;
  const hoy = new Date().toISOString().split('T')[0];
  await supabase.from('cuotas').update({ estado: 'pagada', fecha_pago: hoy, metodo_pago: metodo_pago || 'efectivo' })
    .eq('socio_id', id).neq('estado', 'pagada');
  await supabase.from('socios').update({ estado_cuota: 'Al dia', saldo: 0 }).eq('id', id);
  if (monto && Number(monto) > 0) {
    await supabase.from('ingresos').insert({ concepto: concepto || 'Cuota', monto: Number(monto), categoria: categoria || 'Cuota deportiva', fecha: hoy });
  }
  res.json({ mensaje: 'Pago registrado' });
});

app.post('/api/cuotas/:id/pagar', requireWrite, async (req, res) => {
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
    .neq('estado_cuota', 'Al dia')
    .order('nombre');
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

app.post('/api/ingresos', requireWrite, async (req, res) => {
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

app.post('/api/gastos', requireWrite, async (req, res) => {
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
//  ALQUILERES — GRILLA PÚBLICA
// ═══════════════════════════════════════════════════════════
app.get('/api/alquileres/config', (req, res) => {
  res.json({ canchas: CANCHAS_CFG, horas: HORAS_ALQUILER });
});

app.get('/api/alquileres/grilla', async (req, res) => {
  const desde = req.query.desde || new Date().toISOString().slice(0, 10);
  const dHasta = new Date(desde + 'T12:00:00');
  dHasta.setDate(dHasta.getDate() + DIAS_A_MOSTRAR - 1);
  const hasta = dHasta.toISOString().slice(0, 10);

  const [qAlq, qFijos] = await Promise.all([
    supabase.from('alquileres')
      .select('cancha, fecha, hora, estado, expires_at')
      .gte('fecha', desde).lte('fecha', hasta)
      .in('estado', ['confirmada', 'pending']),
    supabase.from('alquileres_fijos')
      .select('cancha, dia_semana, hora, cliente, vigente_desde, vigente_hasta')
      .eq('activo', true),
  ]);
  if (qAlq.error) return res.status(500).json({ error: qAlq.error.message });
  if (qFijos.error) return res.status(500).json({ error: qFijos.error.message });

  const now = Date.now();
  const ocupados = new Set();
  for (const a of qAlq.data || []) {
    if (a.estado === 'pending' && (!a.expires_at || new Date(a.expires_at).getTime() < now)) continue;
    ocupados.add(`${a.cancha}|${a.fecha}|${a.hora}`);
  }

  const fijosByKey = new Map(); // `cancha|dow|hora` → cliente
  for (const f of qFijos.data || []) fijosByKey.set(`${f.cancha}|${f.dia_semana}|${f.hora}`, f.cliente);

  const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dias = [];
  for (let i = 0; i < DIAS_A_MOSTRAR; i++) {
    const d = new Date(desde + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const fecha = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const slots = [];
    for (const c of CANCHAS_CFG) {
      for (const h of HORAS_ALQUILER) {
        const kOc = `${c.id}|${fecha}|${h}`;
        const kFj = `${c.id}|${dow}|${h}`;
        let estado = 'libre', cliente = null;
        if (ocupados.has(kOc)) estado = 'ocupado';
        else if (fijosByKey.has(kFj)) { estado = 'fijo'; cliente = fijosByKey.get(kFj); }
        slots.push({ cancha: c.id, hora: h, estado, cliente });
      }
    }
    dias.push({ fecha, dow, dia_corto: DIAS_CORTO[dow], dia_num: d.getDate(), slots });
  }

  res.json({ desde, hasta, canchas: CANCHAS_CFG, horas: HORAS_ALQUILER, dias });
});

// ═══════════════════════════════════════════════════════════
//  RESERVA PÚBLICA CON MERCADOPAGO
// ═══════════════════════════════════════════════════════════
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

app.post('/api/alquileres/reservar', async (req, res) => {
  const { cancha, fecha, hora, cliente, telefono, email } = req.body || {};
  if (!cancha || !fecha || hora === undefined || !cliente || !telefono) {
    return res.status(400).json({ error: 'Faltan datos (cancha, fecha, hora, cliente, telefono).' });
  }
  const cfg = CANCHAS_CFG.find(c => c.id === cancha);
  if (!cfg) return res.status(400).json({ error: 'Cancha inválida' });
  if (!HORAS_ALQUILER.includes(Number(hora))) return res.status(400).json({ error: 'Horario fuera de rango (21 o 22 hs)' });

  // Limpiar pendings vencidos para este slot
  await supabase.from('alquileres')
    .delete()
    .eq('cancha', cancha).eq('fecha', fecha).eq('hora', hora)
    .eq('estado', 'pending')
    .lt('expires_at', new Date().toISOString());

  // Chequear colisión con confirmadas o pendings vivos
  const { data: existentes } = await supabase.from('alquileres')
    .select('id, estado, expires_at')
    .eq('cancha', cancha).eq('fecha', fecha).eq('hora', hora)
    .in('estado', ['confirmada', 'pending']);

  const vivos = (existentes || []).filter(a =>
    a.estado === 'confirmada' || (a.expires_at && new Date(a.expires_at).getTime() > Date.now())
  );
  if (vivos.length) return res.status(409).json({ error: 'Ese turno ya está reservado' });

  // Chequear turno fijo recurrente
  const dow = new Date(fecha + 'T12:00:00').getDay();
  const { data: fijos } = await supabase.from('alquileres_fijos')
    .select('id').eq('activo', true)
    .eq('cancha', cancha).eq('dia_semana', dow).eq('hora', hora);
  if (fijos && fijos.length) return res.status(409).json({ error: 'Ese horario tiene turno fijo' });

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data: alq, error: insErr } = await supabase
    .from('alquileres')
    .insert({
      cancha, fecha, hora: Number(hora),
      cliente, telefono, email: email || '',
      monto: cfg.precio, pagado: false, estado: 'pending', expires_at: expiresAt,
    })
    .select().single();

  if (insErr) {
    if (insErr.code === '23505') return res.status(409).json({ error: 'Turno ya reservado' });
    return res.status(500).json({ error: insErr.message });
  }

  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado en el servidor' });
  }

  try {
    const mpResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          id: String(alq.id),
          title: `Alquiler ${cfg.nombre} — ${fecha} ${hora}:00h`,
          quantity: 1,
          unit_price: cfg.precio,
          currency_id: 'ARS',
        }],
        payer: { name: cliente, email: email || undefined },
        metadata: { alquiler_id: alq.id },
        external_reference: String(alq.id),
        notification_url: `${PUBLIC_URL}/api/mp/webhook`,
        back_urls: {
          success: `${PUBLIC_URL}/?pago=ok&alq=${alq.id}#alquiler`,
          failure: `${PUBLIC_URL}/?pago=err&alq=${alq.id}#alquiler`,
          pending: `${PUBLIC_URL}/?pago=pendiente&alq=${alq.id}#alquiler`,
        },
        auto_return: 'approved',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: expiresAt,
      }),
    });
    const mp = await mpResp.json();
    if (!mpResp.ok) {
      console.error('[MP preference error]', mp);
      await supabase.from('alquileres').delete().eq('id', alq.id);
      return res.status(502).json({ error: 'MercadoPago rechazó la preferencia', detail: mp.message || mp });
    }
    await supabase.from('alquileres').update({ mp_preference_id: mp.id }).eq('id', alq.id);
    res.json({
      alquiler_id: alq.id,
      init_point: mp.init_point,
      sandbox_init_point: mp.sandbox_init_point,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('[MP preference exception]', err);
    await supabase.from('alquileres').delete().eq('id', alq.id);
    res.status(502).json({ error: 'No se pudo conectar con MercadoPago' });
  }
});

app.post('/api/mp/webhook', async (req, res) => {
  res.status(200).send('ok'); // ack rápido
  const type = req.body?.type || req.query?.type;
  const paymentId = req.body?.data?.id || req.query?.['data.id'] || req.query?.id;
  if (type !== 'payment' || !paymentId) return;

  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const pago = await r.json();
    if (!r.ok) return console.error('[MP webhook] fetch pago fallo', pago);

    const alquilerId = pago.external_reference || pago.metadata?.alquiler_id;
    if (!alquilerId) return console.error('[MP webhook] sin external_reference');

    if (pago.status === 'approved') {
      await supabase.from('alquileres').update({
        estado: 'confirmada',
        pagado: true,
        mp_payment_id: String(pago.id),
        expires_at: null,
      }).eq('id', alquilerId);
    } else if (pago.status === 'rejected' || pago.status === 'cancelled') {
      await supabase.from('alquileres').update({
        estado: 'cancelada',
        mp_payment_id: String(pago.id),
      }).eq('id', alquilerId);
    }
  } catch (e) {
    console.error('[MP webhook] excepcion', e);
  }
});

app.get('/api/alquileres/:id/status', async (req, res) => {
  const { data, error } = await supabase.from('alquileres')
    .select('id, cancha, fecha, hora, estado, pagado, expires_at, monto, cliente')
    .eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No encontrada' });
  res.json(data);
});

// ═══════════════════════════════════════════════════════════
//  ALQUILERES — ADMIN (listados, alta manual, bloqueo)
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

app.post('/api/alquileres', requireWrite, async (req, res) => {
  const { cancha, fecha, hora, cliente, telefono, monto, pagado } = req.body;
  if (!cancha || !fecha || hora === undefined) return res.status(400).json({ error: 'Faltan cancha, fecha u hora' });

  const { data, error } = await supabase
    .from('alquileres')
    .insert({
      cancha, fecha, hora,
      cliente: cliente || '',
      telefono: telefono || '',
      monto: monto || 0,
      pagado: !!pagado,
      estado: 'confirmada',
    })
    .select().single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Turno ya reservado' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

app.put('/api/alquileres/:id', requireWrite, async (req, res) => {
  const allowed = ['cancha','fecha','hora','cliente','telefono','monto','pagado','estado'];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Sin campos válidos' });

  const { data, error } = await supabase
    .from('alquileres').update(updates).eq('id', req.params.id).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(data);
});

app.delete('/api/alquileres/:id', requireWrite, async (req, res) => {
  const { error } = await supabase.from('alquileres').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ mensaje: 'Reserva cancelada' });
});

// ═══════════════════════════════════════════════════════════
//  TURNOS FIJOS RECURRENTES (admin)
// ═══════════════════════════════════════════════════════════
app.get('/api/alquileres/fijos', async (req, res) => {
  const { data, error } = await supabase.from('alquileres_fijos')
    .select('*').eq('activo', true).order('dia_semana').order('hora');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/alquileres/fijos', requireWrite, async (req, res) => {
  const { cancha, dia_semana, hora, cliente, telefono } = req.body || {};
  if (!cancha || dia_semana === undefined || hora === undefined) {
    return res.status(400).json({ error: 'Faltan cancha, dia_semana u hora' });
  }
  const { data, error } = await supabase.from('alquileres_fijos')
    .insert({ cancha, dia_semana: Number(dia_semana), hora: Number(hora), cliente: cliente || '', telefono: telefono || '' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/api/alquileres/fijos/:id', requireWrite, async (req, res) => {
  const { error } = await supabase.from('alquileres_fijos')
    .update({ activo: false }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ mensaje: 'Turno fijo eliminado' });
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
  const [totalQ, alDiaQ, inhabQ, ingQ, gasQ] = await Promise.all([
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true).eq('estado_cuota', 'Al dia'),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true).neq('estado_cuota', 'Al dia'),
    supabase.from('ingresos').select('monto'),
    supabase.from('gastos').select('monto'),
  ]);

  const totalIng = (ingQ.data || []).reduce((a, r) => a + Number(r.monto), 0);
  const totalGas = (gasQ.data || []).reduce((a, r) => a + Number(r.monto), 0);

  res.json({
    socios: {
      total: totalQ.count || 0,
      al_dia: alDiaQ.count || 0,
      inhabilitados: inhabQ.count || 0,
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

app.put('/api/disciplinas/:id', requireWrite, async (req, res) => {
  const { precio } = req.body || {};
  if (precio == null || isNaN(Number(precio))) return res.status(400).json({ error: 'Precio inválido' });
  const { data, error } = await supabase
    .from('disciplinas').update({ precio: Number(precio) }).eq('id', req.params.id).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message + ' (¿corriste la migración 010?)' });
  if (!data) return res.status(404).json({ error: 'Disciplina no encontrada' });
  res.json(data);
});

// Config clave-valor (cuota social, etc.)
app.get('/api/config', async (req, res) => {
  const { data, error } = await supabase.from('config').select('*');
  if (error) return res.json({ cuota_social: 1000 }); // tabla puede no existir aún
  const cfg = {}; (data || []).forEach(r => { cfg[r.clave] = r.valor; });
  res.json({ ...cfg, cuota_social: Number(cfg.cuota_social) || 1000 });
});

app.put('/api/config', requireWrite, async (req, res) => {
  const rows = Object.entries(req.body || {}).map(([clave, valor]) => ({ clave, valor: String(valor) }));
  if (!rows.length) return res.status(400).json({ error: 'Sin cambios' });
  const { error } = await supabase.from('config').upsert(rows, { onConflict: 'clave' });
  if (error) return res.status(500).json({ error: error.message + ' (¿corriste la migración 010?)' });
  res.json({ mensaje: 'Configuración actualizada' });
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
