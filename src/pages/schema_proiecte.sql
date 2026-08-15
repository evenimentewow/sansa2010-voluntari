-- ================================================================
-- Proiecte + Jurnal de cheltuieli
-- Ruleaza in Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS proiecte (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  denumire    TEXT NOT NULL,
  descriere   TEXT,
  an          INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  buget       DECIMAL(12,2),
  status      TEXT DEFAULT 'activ',        -- activ | incheiat | suspendat
  creat_de    TEXT
);

CREATE TABLE IF NOT EXISTS cheltuieli (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  proiect_id    UUID REFERENCES proiecte(id) ON DELETE CASCADE,
  data_chelt    DATE NOT NULL DEFAULT CURRENT_DATE,
  descriere     TEXT NOT NULL,
  initiator     TEXT,
  sursa_fonduri TEXT NOT NULL DEFAULT 'cash',   -- banca | cash
  suma          DECIMAL(12,2) NOT NULL DEFAULT 0,
  document      TEXT,                            -- nr. factura / bon (optional)
  observatii    TEXT,
  inregistrat_de TEXT
);

CREATE INDEX IF NOT EXISTS idx_cheltuieli_proiect ON cheltuieli(proiect_id);
CREATE INDEX IF NOT EXISTS idx_cheltuieli_data ON cheltuieli(data_chelt);

ALTER TABLE proiecte   DISABLE ROW LEVEL SECURITY;
ALTER TABLE cheltuieli DISABLE ROW LEVEL SECURITY;
