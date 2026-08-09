-- ================================================================
-- Serii anuale pentru contracte si chitante
-- Ruleaza in Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS serii (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  tip           TEXT NOT NULL,           -- 'contract' sau 'chitanta'
  an            INTEGER NOT NULL,
  prefix        TEXT DEFAULT '',         -- ex: SP, CH
  numar_start   INTEGER DEFAULT 1,
  activa        BOOLEAN DEFAULT TRUE,
  UNIQUE(tip, an)
);

ALTER TABLE serii DISABLE ROW LEVEL SECURITY;

-- Coloane pentru seria si numarul afisat
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS serie_prefix TEXT;
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS serie_an INTEGER;
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS chitanta_prefix TEXT;

-- Serii implicite pentru anul curent
INSERT INTO serii (tip, an, prefix, numar_start) VALUES
  ('contract', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 'SP', 1),
  ('chitanta', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 'CH', 1)
ON CONFLICT (tip, an) DO NOTHING;
