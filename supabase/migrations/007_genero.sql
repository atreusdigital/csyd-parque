-- ============================================================
--  Migracion 007 — Genero del socio
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

ALTER TABLE socios
  ADD COLUMN IF NOT EXISTS genero TEXT
  CHECK (genero IS NULL OR genero IN ('F','M','O'));

CREATE INDEX IF NOT EXISTS idx_socios_genero ON socios(genero);
