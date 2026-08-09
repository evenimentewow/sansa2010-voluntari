-- ================================================================
-- Modul SPONSORIZĂRI - rulează în Supabase SQL Editor
-- ================================================================

-- Tabel contracte sponsorizare cu numerotare consecutivă
CREATE TABLE IF NOT EXISTS sponsorizari (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  numar         INTEGER NOT NULL UNIQUE,
  data_contract DATE DEFAULT CURRENT_DATE,

  -- Date sponsor
  sponsor_denumire    TEXT NOT NULL,
  sponsor_sediu       TEXT,
  sponsor_reg_com     TEXT,
  sponsor_cui         TEXT,
  sponsor_cont        TEXT,
  sponsor_banca       TEXT,
  sponsor_reprezentant TEXT,
  sponsor_ci_serie    TEXT,
  sponsor_ci_numar    TEXT,
  sponsor_cnp         TEXT,
  sponsor_calitate    TEXT,

  -- Detalii contract
  suma          DECIMAL(12,2) NOT NULL,
  data_limita   DATE,

  -- Chitanță
  are_chitanta  BOOLEAN DEFAULT FALSE,
  chitanta_numar INTEGER,
  chitanta_data  DATE,

  introdus_de   TEXT DEFAULT 'guest'
);

-- Funcție pentru următorul număr de contract (n+1)
CREATE OR REPLACE FUNCTION next_numar_sponsorizare()
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(numar), 0) + 1 FROM sponsorizari;
$$ LANGUAGE sql;

-- Funcție pentru următorul număr de chitanță (n+1)
CREATE OR REPLACE FUNCTION next_numar_chitanta()
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(chitanta_numar), 0) + 1 FROM sponsorizari WHERE chitanta_numar IS NOT NULL;
$$ LANGUAGE sql;

-- Fără RLS ca să poată introduce și guest
ALTER TABLE sponsorizari DISABLE ROW LEVEL SECURITY;
