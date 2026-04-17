-- ============================================================
--  Migracion 004 — Disciplinas
--  Catalogo de disciplinas del club (5 iniciales)
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE TABLE IF NOT EXISTS disciplinas (
  id             BIGSERIAL PRIMARY KEY,
  nombre         TEXT UNIQUE NOT NULL,
  activa         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE disciplinas ENABLE ROW LEVEL SECURITY;

INSERT INTO disciplinas (nombre) VALUES
  ('Futsal'),
  ('Baby Futbol'),
  ('Cestoball'),
  ('Futbol Femenino'),
  ('Newcom')
ON CONFLICT (nombre) DO NOTHING;
