-- ============================================================
--  Migracion 010 — Precios de cuotas (deportiva por disciplina + social)
--  Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- Precio mensual (cuota deportiva) de cada disciplina
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS precio NUMERIC NOT NULL DEFAULT 48000;

-- Tabla de configuracion clave-valor (cuota social y otros ajustes)
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

INSERT INTO config (clave, valor) VALUES ('cuota_social', '1000')
  ON CONFLICT (clave) DO NOTHING;
