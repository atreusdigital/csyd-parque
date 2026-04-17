-- ============================================================
--  Migracion 002 — Canchas
--  Agrega catalogo de canchas (3 iniciales)
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE TABLE IF NOT EXISTS canchas (
  id             BIGSERIAL PRIMARY KEY,
  nombre         TEXT UNIQUE NOT NULL,
  numero         INTEGER UNIQUE,
  tipo           TEXT,
  precio_hora    NUMERIC(12,2) DEFAULT 0,
  activa         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE canchas ENABLE ROW LEVEL SECURITY;

INSERT INTO canchas (nombre, numero) VALUES
  ('Jose Batista',    1),
  ('Ramon Maddoni',   2),
  ('Cesar La Paglia', 3)
ON CONFLICT (nombre) DO NOTHING;
