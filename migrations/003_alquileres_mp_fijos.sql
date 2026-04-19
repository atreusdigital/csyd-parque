-- =========================================================
-- Migration 003 — Alquileres con MercadoPago + Turnos fijos
-- Correr en: Supabase Dashboard → SQL Editor
-- =========================================================

-- 1) Columnas nuevas en "alquileres"
ALTER TABLE alquileres
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'confirmada',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;

-- Indice unico parcial: solo impide colisión entre confirmadas/pendings activas.
-- El constraint viejo bloqueaba TODO insert; el parcial permite que un slot
-- cancelado se pueda reservar de nuevo.
ALTER TABLE alquileres DROP CONSTRAINT IF EXISTS alquileres_cancha_fecha_hora_key;
DROP INDEX IF EXISTS alquileres_cancha_fecha_hora_key;
CREATE UNIQUE INDEX IF NOT EXISTS alquileres_slot_unico
  ON alquileres (cancha, fecha, hora)
  WHERE estado IN ('confirmada','pending');

-- 2) Tabla de turnos fijos recurrentes
CREATE TABLE IF NOT EXISTS alquileres_fijos (
  id SERIAL PRIMARY KEY,
  cancha TEXT NOT NULL,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom..6=Sab
  hora INT NOT NULL,
  cliente TEXT,
  telefono TEXT,
  vigente_desde DATE DEFAULT CURRENT_DATE,
  vigente_hasta DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fijos_cancha_dia
  ON alquileres_fijos (cancha, dia_semana, hora)
  WHERE activo = TRUE;

-- 3) Seed: turnos fijos de la Cancha 3 (César La Paglia)
--    Si ya los cargaste, borrá esta parte.
INSERT INTO alquileres_fijos (cancha, dia_semana, hora, cliente) VALUES
  ('Cesar La Paglia', 2, 21, '1ra Futsal'),
  ('Cesar La Paglia', 2, 22, '3ra Futsal'),
  ('Cesar La Paglia', 4, 21, 'Grupo de Padres'),
  ('Cesar La Paglia', 4, 22, '1ra Futsal'),
  ('Cesar La Paglia', 5, 21, '1ra Futsal'),
  ('Cesar La Paglia', 5, 22, '3ra Futsal')
ON CONFLICT DO NOTHING;
