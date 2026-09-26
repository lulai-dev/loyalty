-- Esquema v2: plataforma multi-negocio.
-- Córrelo en el SQL Editor de Neon.

-- Dueños de negocio (los das de alta con: npm run crear-usuario)
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un negocio pertenece a un usuario. El slug es el subdominio / la ruta.
CREATE TABLE IF NOT EXISTS negocios (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  nombre     TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,   -- ej. "cafe-irving" (minúsculas, guiones)
  giro       TEXT,                   -- ej. "cafetería", "dentista"
  pin        TEXT NOT NULL DEFAULT '1234',  -- PIN del cajero de ESTE negocio
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un negocio puede tener varios programas de lealtad.
CREATE TABLE IF NOT EXISTS programas (
  id         SERIAL PRIMARY KEY,
  negocio_id INTEGER NOT NULL REFERENCES negocios(id),
  nombre     TEXT NOT NULL DEFAULT 'Tarjeta de sellos',
  tipo       TEXT NOT NULL DEFAULT 'sellos',   -- v1: 'sellos' (puntos vendrá después)
  meta       INTEGER NOT NULL DEFAULT 6,       -- sellos para el premio
  premio     TEXT NOT NULL DEFAULT '1 producto gratis',
  activo     BOOLEAN NOT NULL DEFAULT true,
  -- Diseño de la tarjeta (colores, logo, textos) como JSON:
  -- { "bg":"#3c2d23", "fg":"#ffffff", "label":"#ebdcc8",
  --   "logo":"data:image/png;base64,...", "hero":"data:image/png;base64,...",
  --   "como":"texto de instrucciones" }
  diseno     JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada cliente final = un pase de un programa.
CREATE TABLE IF NOT EXISTS pases (
  serial         TEXT PRIMARY KEY,             -- uuid; va dentro del QR
  programa_id    INTEGER NOT NULL REFERENCES programas(id),
  nombre         TEXT NOT NULL,
  telefono       TEXT,
  plataforma     TEXT NOT NULL,                -- 'apple' | 'google'
  sellos         INTEGER NOT NULL DEFAULT 0,
  premios        INTEGER NOT NULL DEFAULT 0,
  auth_token     TEXT NOT NULL,                -- autenticación del web service de Apple
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pases_programa ON pases(programa_id);

-- Push tokens de dispositivos Apple.
CREATE TABLE IF NOT EXISTS apple_registros (
  device_library_id TEXT NOT NULL,
  serial            TEXT NOT NULL REFERENCES pases(serial) ON DELETE CASCADE,
  push_token        TEXT NOT NULL,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_library_id, serial)
);
CREATE INDEX IF NOT EXISTS idx_apple_registros_serial ON apple_registros(serial);

-- Auditoría de todo movimiento de sellos.
CREATE TABLE IF NOT EXISTS eventos (
  id        SERIAL PRIMARY KEY,
  serial    TEXT NOT NULL,
  tipo      TEXT NOT NULL,          -- 'sello' | 'premio' | 'ajuste' | 'reset'
  origen    TEXT NOT NULL DEFAULT 'qr',  -- 'qr' (cajero) | 'manual' (panel del dueño)
  delta     INTEGER,                -- cambio aplicado (p.ej. +1, -3)
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_serial ON eventos(serial);
