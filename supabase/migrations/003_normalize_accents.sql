-- ============================================================
--  Migracion 003 — Normalizar acentos/tildes
--  Quita todos los acentos de los datos existentes (socios,
--  gastos, ingresos, puertas). Regla del proyecto: los textos
--  van sin tildes para que la busqueda funcione (ILIKE no es
--  accent-insensitive).
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Socios: nombre
UPDATE socios SET nombre = unaccent(nombre);

-- Socios: disciplinas (JSONB array de strings)
UPDATE socios
SET disciplinas = (
  SELECT COALESCE(jsonb_agg(unaccent(elem)), '[]'::jsonb)
  FROM jsonb_array_elements_text(disciplinas) AS elem
)
WHERE jsonb_array_length(disciplinas) > 0;

-- Gastos / Ingresos: concepto + categoria
UPDATE gastos    SET concepto = unaccent(concepto), categoria = unaccent(categoria);
UPDATE ingresos  SET concepto = unaccent(concepto), categoria = unaccent(categoria);

-- Puertas
UPDATE puertas   SET nombre = unaccent(nombre),
                     ubicacion = COALESCE(unaccent(ubicacion), ubicacion);
