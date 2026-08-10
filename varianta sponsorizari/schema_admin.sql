-- ================================================================
-- Administrare useri + observatii + serii contracte voluntariat
-- Ruleaza in Supabase SQL Editor
-- ================================================================

-- Utilizatori aplicatie (administrabili din interfata)
CREATE TABLE IF NOT EXISTS app_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  email       TEXT NOT NULL UNIQUE,
  parola      TEXT NOT NULL,
  nume        TEXT,
  rol         TEXT DEFAULT 'guest',      -- admin | operator | guest
  activ       BOOLEAN DEFAULT TRUE
);

ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Utilizatorii existenti
INSERT INTO app_users (email, parola, nume, rol) VALUES
  ('asociatia.sansa2010@gmail.com', 'Sansa2010!', 'Spiridon Mihaela-Iulia', 'admin'),
  ('guest@sansa2010.ro', 'Guest2010!', 'Utilizator Guest', 'guest')
ON CONFLICT (email) DO NOTHING;

-- Observatii pe contractele de sponsorizare
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS observatii TEXT;

-- Serie pentru contractele de voluntariat
INSERT INTO serii (tip, an, prefix, numar_start) VALUES
  ('voluntariat', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 'VOL', 1)
ON CONFLICT (tip, an) DO NOTHING;
