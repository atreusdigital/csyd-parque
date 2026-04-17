-- ============================================================
--  Migracion 006 — estado_cuota sin acento
--  Normaliza "Al dia" (sin tilde) como valor estandar
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Cambiar default
ALTER TABLE socios ALTER COLUMN estado_cuota SET DEFAULT 'Al dia';

-- Normalizar filas existentes
UPDATE socios SET estado_cuota = 'Al dia' WHERE estado_cuota = 'Al día';
