-- ============================================================
--  CSyD PARQUE — Schema inicial para Supabase (Postgres)
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
--  Fecha: 2026-04-16
-- ============================================================

-- ─── SOCIOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS socios (
  id             BIGSERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  dni            TEXT UNIQUE NOT NULL,
  rfid           TEXT UNIQUE NOT NULL,
  categoria      TEXT DEFAULT 'Activo',
  estado_cuota   TEXT DEFAULT 'Al día',
  saldo          NUMERIC(12,2) DEFAULT 0,
  disciplinas    JSONB DEFAULT '[]'::jsonb,
  telefono       TEXT,
  email          TEXT,
  foto_url       TEXT,
  fecha_alta     DATE DEFAULT CURRENT_DATE,
  activo         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_socios_rfid          ON socios(rfid) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_socios_activo        ON socios(activo);
CREATE INDEX IF NOT EXISTS idx_socios_estado_cuota  ON socios(estado_cuota);

-- ─── CUOTAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuotas (
  id             BIGSERIAL PRIMARY KEY,
  socio_id       BIGINT NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  periodo        TEXT NOT NULL,
  monto          NUMERIC(12,2) NOT NULL,
  pagado         NUMERIC(12,2) DEFAULT 0,
  estado         TEXT DEFAULT 'pendiente',
  fecha_venc     DATE,
  fecha_pago     DATE,
  metodo_pago    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (socio_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_cuotas_socio   ON cuotas(socio_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_estado  ON cuotas(estado);

-- ─── ACCESOS (log de molinetes) ────────────────────────────
CREATE TABLE IF NOT EXISTS accesos (
  id             BIGSERIAL PRIMARY KEY,
  rfid           TEXT NOT NULL,
  socio_id       BIGINT REFERENCES socios(id) ON DELETE SET NULL,
  puerta         TEXT DEFAULT 'Puerta 1',
  resultado      TEXT NOT NULL,
  motivo         TEXT,
  ip_placa       TEXT,
  timestamp      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accesos_rfid       ON accesos(rfid);
CREATE INDEX IF NOT EXISTS idx_accesos_timestamp  ON accesos(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_accesos_resultado  ON accesos(resultado);

-- ─── PUERTAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS puertas (
  id             BIGSERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  ip             TEXT,
  tipo           TEXT DEFAULT 'molinete',
  ubicacion      TEXT,
  activa         BOOLEAN DEFAULT TRUE
);

-- ─── GASTOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gastos (
  id             BIGSERIAL PRIMARY KEY,
  fecha          DATE DEFAULT CURRENT_DATE,
  concepto       TEXT NOT NULL,
  monto          NUMERIC(12,2) NOT NULL,
  categoria      TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_fecha      ON gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria  ON gastos(categoria);

-- ─── INGRESOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingresos (
  id             BIGSERIAL PRIMARY KEY,
  fecha          DATE DEFAULT CURRENT_DATE,
  concepto       TEXT NOT NULL,
  monto          NUMERIC(12,2) NOT NULL,
  categoria      TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingresos_fecha      ON ingresos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ingresos_categoria  ON ingresos(categoria);

-- ─── ALQUILERES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alquileres (
  id             BIGSERIAL PRIMARY KEY,
  cancha         TEXT NOT NULL,
  fecha          DATE NOT NULL,
  hora           TEXT NOT NULL,
  cliente        TEXT,
  telefono       TEXT,
  monto          NUMERIC(12,2) DEFAULT 0,
  estado         TEXT DEFAULT 'reservado',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cancha, fecha, hora)
);

CREATE INDEX IF NOT EXISTS idx_alquileres_fecha  ON alquileres(fecha);

-- ─── TRIGGER: updated_at en socios ─────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_socios_updated ON socios;
CREATE TRIGGER trg_socios_updated BEFORE UPDATE ON socios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS (Row Level Security) ──────────────────────────────
-- El API se conecta con service_role (bypassa RLS).
-- Activamos RLS sin policies → bloquea cualquier acceso con anon key.
ALTER TABLE socios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuotas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE accesos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE puertas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alquileres ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  SEED DATA (datos de prueba — mismos que traía sql.js)
-- ============================================================

INSERT INTO socios (nombre, dni, rfid, categoria, estado_cuota, saldo, disciplinas, telefono, email) VALUES
  ('María González',  '32445112', '0010048721', 'Activo',    'Al día',       0, '["Fútbol","Gimnasio"]'::jsonb, '11-5544-9922', 'maria@mail.com'),
  ('Juan Pérez',      '28112309', '0010048722', 'Activo',    'Moroso',  -32000, '["Fútbol"]'::jsonb,            '11-4011-2233', 'juan@mail.com'),
  ('Lucía Fernández', '41908221', '0010048723', 'Cadete',    'Al día',       0, '["Vóley","Natación"]'::jsonb,  '11-6677-1200', 'lucia@mail.com'),
  ('Carlos Ramírez',  '25002876', '0010048724', 'Vitalicio', 'Al día',       0, '["Gimnasio"]'::jsonb,          '11-3322-1010', 'carlos@mail.com'),
  ('Sofía Álvarez',   '44120558', '0010048725', 'Cadete',    'Moroso',  -16000, '["Patín","Gimnasio"]'::jsonb,  '11-7733-5500', 'sofia@mail.com'),
  ('Diego López',     '30887112', '0010048726', 'Activo',    'Al día',       0, '["Básquet"]'::jsonb,           '11-5050-6060', 'diego@mail.com'),
  ('Ana Suárez',      '33221984', '0010048727', 'Activo',    'Moroso',  -48000, '["Natación","Vóley"]'::jsonb,  '11-9900-1122', 'ana@mail.com'),
  ('Martín Ibáñez',   '27554332', '0010048728', 'Activo',    'Al día',       0, '["Fútbol","Básquet"]'::jsonb,  '11-8833-4455', 'martin@mail.com')
ON CONFLICT (dni) DO NOTHING;

INSERT INTO puertas (nombre, ip, tipo, ubicacion) VALUES
  ('Molinete Principal',       '192.168.1.50', 'molinete', 'Entrada principal'),
  ('Puerta Pileta',            '192.168.1.51', 'puerta',   'Acceso natatorio'),
  ('Barrera Estacionamiento',  '192.168.1.52', 'barrera',  'Playa de estacionamiento')
ON CONFLICT DO NOTHING;

INSERT INTO gastos (fecha, concepto, monto, categoria) VALUES
  ('2026-04-05', 'Sueldo Prof. Fútbol (x3)',         1650000, 'Sueldos'),
  ('2026-04-07', 'Inscripción Liga AFA Amateur',      320000, 'Ligas'),
  ('2026-04-09', 'Luz + Gas + Agua',                  480000, 'Servicios'),
  ('2026-04-11', 'Mantenimiento canchas césped',      210000, 'Mantenimiento'),
  ('2026-04-13', 'Insumos limpieza',                   95000, 'Servicios'),
  ('2026-04-14', 'Sueldo Prof. Natación',             620000, 'Sueldos'),
  ('2026-04-14', 'Pago árbitros torneo interno',      180000, 'Ligas');

INSERT INTO ingresos (fecha, concepto, monto, categoria) VALUES
  ('2026-04-10', 'Cuotas sociales abril (parcial)', 9420000, 'Cuotas'),
  ('2026-04-12', 'Alquiler cancha F5 — Empresa Z',   180000, 'Alquileres'),
  ('2026-04-08', 'Cantina y bar',                    420000, 'Cantina'),
  ('2026-04-05', 'Inscripción escuela básquet',      260000, 'Escuelas');
