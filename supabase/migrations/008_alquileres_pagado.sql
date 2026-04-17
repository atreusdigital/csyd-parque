-- ============================================================
--  Migracion 008 — Marca pagado/pendiente en alquileres
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

ALTER TABLE alquileres
  ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_alquileres_pagado ON alquileres(pagado);
