-- ================================================================
-- Tabel persoane împuternicite cu drept de semnătură
-- Rulează în Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS imputerniciti (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  nume        TEXT NOT NULL,
  functie     TEXT DEFAULT 'imputernicit',
  activ       BOOLEAN DEFAULT TRUE
);

ALTER TABLE imputerniciti DISABLE ROW LEVEL SECURITY;

-- Coloane noi pe sponsorizari pentru semnatari
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS semnatar1_nume TEXT;
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS semnatar1_functie TEXT;
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS semnatar2_nume TEXT;
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS semnatar2_functie TEXT;

-- Președinta ca prim împuternicit implicit
INSERT INTO imputerniciti (nume, functie) VALUES
  ('Spiridon Mihaela Iulia', 'presedinte')
ON CONFLICT DO NOTHING;
