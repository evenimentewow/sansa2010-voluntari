-- ================================================================
-- Alocare sponsorizari la proiecte + cereri de stergere
-- Ruleaza in Supabase SQL Editor
-- ================================================================

-- 1) Contractul de sponsorizare poate fi alocat unui proiect
ALTER TABLE sponsorizari ADD COLUMN IF NOT EXISTS proiect_id UUID REFERENCES proiecte(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sponsorizari_proiect ON sponsorizari(proiect_id);

-- 2) Cereri de stergere a cheltuielilor (supervizate de admin)
CREATE TABLE IF NOT EXISTS cereri_stergere (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  cheltuiala_id UUID REFERENCES cheltuieli(id) ON DELETE CASCADE,
  proiect_id    UUID REFERENCES proiecte(id) ON DELETE CASCADE,
  -- copie a datelor, ca sa ramana lizibile chiar daca randul dispare
  descriere     TEXT,
  suma          DECIMAL(12,2),
  data_chelt    DATE,
  motiv         TEXT,
  solicitat_de  TEXT,
  status        TEXT DEFAULT 'in_asteptare',   -- in_asteptare | aprobata | respinsa
  decis_de      TEXT,
  decis_la      TIMESTAMPTZ,
  motiv_decizie TEXT
);

CREATE INDEX IF NOT EXISTS idx_cereri_status ON cereri_stergere(status);

ALTER TABLE cereri_stergere DISABLE ROW LEVEL SECURITY;
