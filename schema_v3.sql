-- ================================================================
-- Contracte voluntariat cu serie + notificari email
-- Ruleaza in Supabase SQL Editor
-- ================================================================

-- Serie si numar pe contractele de voluntariat
ALTER TABLE contracte ADD COLUMN IF NOT EXISTS serie_prefix TEXT;
ALTER TABLE contracte ADD COLUMN IF NOT EXISTS serie_an INTEGER;
ALTER TABLE contracte ADD COLUMN IF NOT EXISTS numar_int INTEGER;
ALTER TABLE contracte ADD COLUMN IF NOT EXISTS semnatar_nume TEXT;
ALTER TABLE contracte ADD COLUMN IF NOT EXISTS semnatar_functie TEXT;

-- Numar consecutiv pentru contractele de voluntariat
CREATE OR REPLACE FUNCTION next_numar_voluntariat()
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(numar_int), 0) + 1 FROM contracte;
$$ LANGUAGE sql;

-- Ora de inceput/sfarsit pe activitati (pentru calendar)
ALTER TABLE activitati ADD COLUMN IF NOT EXISTS ora_start TEXT;
ALTER TABLE activitati ADD COLUMN IF NOT EXISTS ora_final TEXT;

-- Evidenta notificarilor trimise
CREATE TABLE IF NOT EXISTS notificari (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  tip         TEXT,              -- inrolare | activitate | contract
  destinatar  TEXT,
  subiect     TEXT,
  status      TEXT DEFAULT 'trimis',   -- trimis | esuat
  detalii     TEXT
);

ALTER TABLE notificari DISABLE ROW LEVEL SECURITY;
