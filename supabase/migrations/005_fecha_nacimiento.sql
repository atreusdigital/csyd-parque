-- ============================================================
--  Migracion 005 — fecha_nacimiento en socios
--  Necesaria para responder preguntas de edad desde el asistente IA
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

ALTER TABLE socios
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

CREATE INDEX IF NOT EXISTS idx_socios_fecha_nacimiento ON socios(fecha_nacimiento);

-- Funcion helper para calcular edad (reutilizable desde queries/RPC)
CREATE OR REPLACE FUNCTION edad_socio(nacimiento DATE) RETURNS INTEGER AS $$
  SELECT CASE
    WHEN nacimiento IS NULL THEN NULL
    ELSE EXTRACT(YEAR FROM age(nacimiento))::INTEGER
  END;
$$ LANGUAGE SQL IMMUTABLE;
