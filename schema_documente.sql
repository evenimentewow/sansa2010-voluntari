-- ================================================================
-- Documente de identitate atasate voluntarilor
-- Ruleaza in Supabase SQL Editor
-- ================================================================

-- Coloane noi pe voluntari
ALTER TABLE voluntari ADD COLUMN IF NOT EXISTS document_url  TEXT;
ALTER TABLE voluntari ADD COLUMN IF NOT EXISTS document_tip  TEXT;   -- ci | certificat_nastere
ALTER TABLE voluntari ADD COLUMN IF NOT EXISTS acord_stocare BOOLEAN DEFAULT FALSE;
ALTER TABLE voluntari ADD COLUMN IF NOT EXISTS document_la   TIMESTAMPTZ;

-- ================================================================
-- IMPORTANT: creeaza manual bucket-ul de stocare
-- Storage -> New bucket -> nume: documente -> NU bifa "Public bucket"
-- Apoi ruleaza politicile de mai jos.
-- ================================================================

-- Permite incarcarea si citirea documentelor prin cheia publica a aplicatiei
DROP POLICY IF EXISTS "documente_insert" ON storage.objects;
CREATE POLICY "documente_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documente');

DROP POLICY IF EXISTS "documente_select" ON storage.objects;
CREATE POLICY "documente_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'documente');

DROP POLICY IF EXISTS "documente_delete" ON storage.objects;
CREATE POLICY "documente_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'documente');
