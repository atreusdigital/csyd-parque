-- ============================================================
--  Migracion 011 — Beca de socio
--  Socio becado: habilitado para pasar el molinete sin pagar cuota.
--  Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

ALTER TABLE socios ADD COLUMN IF NOT EXISTS beca BOOLEAN NOT NULL DEFAULT FALSE;
