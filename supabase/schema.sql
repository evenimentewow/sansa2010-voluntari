-- ================================================================
-- ȘANSA 2010 — Schema baza de date Supabase
-- Rulează în Supabase Dashboard → SQL Editor
-- ================================================================

-- Extensii necesare
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- VOLUNTARI
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voluntari (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Date personale (conform CI)
  nume          TEXT NOT NULL,
  cnp           TEXT NOT NULL UNIQUE,
  data_nasterii DATE,
  localitate    TEXT NOT NULL,
  adresa        TEXT,
  telefon       TEXT,
  email         TEXT,
  minor         BOOLEAN DEFAULT FALSE,

  -- Act de identitate
  ci_serie      TEXT,
  ci_numar      TEXT,
  ci_eliberat   TEXT,
  ci_data_elib  DATE,

  -- Părinte / tutore (doar pentru minori)
  parinte_nume      TEXT,
  parinte_cnp       TEXT,
  parinte_telefon   TEXT,
  parinte_ci_serie  TEXT,
  parinte_ci_numar  TEXT,
  parinte_ci_elib   TEXT,

  -- Profil
  tip_institutie    TEXT,   -- scoala | angajat | liber | altul
  institutie        TEXT,
  pasiuni           TEXT,
  asteptari_act     TEXT,
  asteptari_asoc    TEXT,
  contributie       TEXT,

  -- Chestionar
  experienta_anterioara TEXT,
  motivatie             TEXT,
  rol_dorit             TEXT[],   -- array de roluri selectate
  rol_altul             TEXT,

  -- Status
  status          TEXT DEFAULT 'activ',   -- activ | inactiv | suspendat
  ore_totale      INTEGER DEFAULT 0,
  data_inrolare   DATE DEFAULT CURRENT_DATE
);

-- ----------------------------------------------------------------
-- CONTRACTE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracte (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  voluntar_id   UUID REFERENCES voluntari(id) ON DELETE CASCADE,
  numar         TEXT,
  data_contract DATE DEFAULT CURRENT_DATE,
  semnat_digital BOOLEAN DEFAULT FALSE,
  semnatura_svg  TEXT,   -- SVG path data pentru semnătura digitală
  semnat_fizic   BOOLEAN DEFAULT FALSE,
  status         TEXT DEFAULT 'generat'   -- generat | semnat | arhivat
);

-- ----------------------------------------------------------------
-- ACTIVITĂȚI
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activitati (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  nume          TEXT NOT NULL,
  data          DATE NOT NULL,
  locatie       TEXT,
  coordonator   TEXT,
  descriere     TEXT,
  status        TEXT DEFAULT 'planificat'   -- planificat | in_desfasurare | incheiat | anulat
);

-- ----------------------------------------------------------------
-- PONTAJ (prezență la activități)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pontaj (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  activitate_id UUID REFERENCES activitati(id) ON DELETE CASCADE,
  voluntar_id   UUID REFERENCES voluntari(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'absent',   -- prezent | absent | partial
  ore           DECIMAL(4,1) DEFAULT 0,
  observatii    TEXT,
  UNIQUE(activitate_id, voluntar_id)
);

-- ----------------------------------------------------------------
-- UTILIZATORI (coordonatori cu roluri)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS utilizatori (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  email       TEXT NOT NULL,
  nume        TEXT,
  rol         TEXT DEFAULT 'responsabil'   -- admin | responsabil | voluntar
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE voluntari    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracte    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activitati   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontaj       ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilizatori  ENABLE ROW LEVEL SECURITY;

-- Admins și responsabili văd tot
CREATE POLICY "Staff vede voluntari" ON voluntari
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM utilizatori WHERE rol IN ('admin','responsabil'))
  );

CREATE POLICY "Staff vede contracte" ON contracte
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM utilizatori WHERE rol IN ('admin','responsabil'))
  );

CREATE POLICY "Staff vede activitati" ON activitati
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM utilizatori WHERE rol IN ('admin','responsabil'))
  );

CREATE POLICY "Staff vede pontaj" ON pontaj
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM utilizatori WHERE rol IN ('admin','responsabil'))
  );

-- Voluntarul vede doar propriile date
CREATE POLICY "Voluntar vede profilul sau" ON voluntari
  FOR SELECT USING (
    email = auth.jwt() ->> 'email'
  );

-- ================================================================
-- DATE DEMO (opțional — șterge dacă nu vrei date de test)
-- ================================================================

INSERT INTO activitati (nume, data, locatie, coordonator, descriere) VALUES
  ('Atelier Creativitate', '2025-03-15', 'Centrul de tineret Pașcani', 'Spiridon Mihaela-Iulia', 'Atelier de arte vizuale pentru tineri'),
  ('Tabăra Împreună pentru Tineri', '2025-07-20', 'Cabana Rarău, Suceava', 'Staff asociație', 'Tabăra anuală de vară'),
  ('Curățenie Ecologică', '2025-04-22', 'Parcul Central Pașcani', 'Ionescu Alexandra', 'Acțiune de ecologizare')
ON CONFLICT DO NOTHING;
