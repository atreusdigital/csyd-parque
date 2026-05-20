-- ============================================================
--  Migracion 009 — Usuarios del panel (roles y permisos)
--  Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre        TEXT NOT NULL,
  usuario       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           TEXT NOT NULL DEFAULT 'recepcion'
                CHECK (rol IN ('admin','tesoreria','recepcion','profe')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
