import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { comprimaImagine, citesteDocument, cnpValid } from '../lib/ocr'
import { Camera, ScanLine, Check, X, AlertTriangle, Trash2, Loader2 } from 'lucide-react'

const CAMPURI = [
  { cheie: 'nume',          eticheta: 'Nume și prenume' },
  { cheie: 'cnp',           eticheta: 'CNP' },
  { cheie: 'data_nasterii', eticheta: 'Data nașterii' },
  { cheie: 'ci_serie',      eticheta: 'Seria actului' },
  { cheie: 'ci_numar',      eticheta: 'Numărul actului' },
  { cheie: 'ci_eliberat',   eticheta: 'Eliberat de' },
  { cheie: 'localitate',    eticheta: 'Localitatea' },
]

export default function UploadDocument({ onDate, onDocument, compact = false }) {
  const inputRef = useRef(null)
  const [tip, setTip] = useState('ci')
  const [imagine, setImagine] = useState(null)
  const [blob, setBlob] = useState(null)
  const [lucreaza, setLucreaza] = useState(false)
  const [pas, setPas] = useState('')
  const [progres, setProgres] = useState(0)
  const [gasit, setGasit] = useState(null)
  const [alese, setAlese] = useState({})
  const [eroare, setEroare] = useState('')
  const [acord, setAcord] = useState(false)
  const [urcat, setUrcat] = useState(false)

  async function alegeFisier(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setEroare(''); setGasit(null); setUrcat(false)
    try {
      const c = await comprimaImagine(f)
      setImagine(c.dataUrl); setBlob(c.blob)
    } catch (err) { setEroare(err.message) }
  }

  async function scaneaza() {
    if (!imagine) return
    setLucreaza(true); setEroare(''); setGasit(null)
    try {
      const rez = await citesteDocument(imagine, tip, (eticheta, p) => {
        setPas(eticheta); setProgres(Math.round(p * 100))
      })
      const utile = {}
      CAMPURI.forEach(c => { if (rez[c.cheie]) utile[c.cheie] = rez[c.cheie] })
      if (Object.keys(utile).length === 0) {
        setEroare('Nu s-au putut extrage date. Încearcă o fotografie mai clară, dreaptă și bine luminată, sau completează manual.')
      } else {
        setGasit({ ...utile, _cnpValid: rez._cnpValid })
        const initiale = {}
        Object.keys(utile).forEach(k => initiale[k] = true)
        setAlese(initiale)
      }
    } catch (err) {
      setEroare(err.message || 'Citirea a eșuat. Completează datele manual.')
    }
    setLucreaza(false); setPas(''); setProgres(0)
  }

  function preia() {
    const date = {}
    Object.entries(alese).forEach(([k, bifat]) => { if (bifat && gasit[k]) date[k] = gasit[k] })
    onDate?.(date)
    setGasit(null)
  }

  async function urcaDocument() {
    if (!blob) return
    if (!acord) return alert('Este necesar acordul pentru păstrarea copiei actului.')
    setLucreaza(true); setEroare('')
    const nume = `${Date.now()}-${tip}.jpg`
    const { error } = await supabase.storage.from('documente').upload(nume, blob, {
      contentType: 'image/jpeg', cacheControl: '3600',
    })
    setLucreaza(false)
    if (error) { setEroare('Încărcarea a eșuat: ' + error.message); return }
    onDocument?.({ document_url: nume, document_tip: tip, acord_stocare: true })
    setUrcat(true)
  }

  function sterge() {
    setImagine(null); setBlob(null); setGasit(null); setUrcat(false); setEroare('')
    onDocument?.({ document_url: null, document_tip: null, acord_stocare: false })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="doc-zona">
      <div className="doc-cap">
        <ScanLine size={17} />
        <div>
          <strong>Completare automată din act</strong>
          <span>Fotografiază sau încarcă actul, iar datele se completează singure</span>
        </div>
      </div>

      <div className="doc-tip">
        <button type="button" className={tip === 'ci' ? 'active' : ''} onClick={() => setTip('ci')}>
          Carte de identitate
        </button>
        <button type="button" className={tip === 'certificat_nastere' ? 'active' : ''} onClick={() => setTip('certificat_nastere')}>
          Certificat de naștere
        </button>
      </div>

      {!imagine ? (
        <label className="doc-incarca">
          <Camera size={26} />
          <strong>Alege sau fotografiază documentul</strong>
          <span>
            {tip === 'ci'
              ? 'Pentru cele mai bune rezultate, fotografiază partea din spate, unde apare banda cu litere și simboluri „<"'
              : 'Fotografiază certificatul întreg, drept și bine luminat'}
          </span>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={alegeFisier} hidden />
        </label>
      ) : (
        <div className="doc-previzualizare">
          <img src={imagine} alt="document" />
          <div className="doc-actiuni">
            <button type="button" className="btn btn-primary btn-sm gap-1.5" onClick={scaneaza} disabled={lucreaza}>
              {lucreaza ? <Loader2 size={13} className="rotire" /> : <ScanLine size={13} />}
              {lucreaza ? 'Se citește...' : 'Citește datele din act'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}>
              Altă fotografie
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={sterge}><Trash2 size={13} /></button>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={alegeFisier} hidden />
          </div>
        </div>
      )}

      {lucreaza && pas && (
        <div className="doc-progres">
          <span>{pas} — {progres}%</span>
          <div className="doc-bara"><div style={{ width: `${progres}%` }} /></div>
        </div>
      )}

      {eroare && (
        <div className="doc-mesaj eroare"><AlertTriangle size={15} /> <span>{eroare}</span></div>
      )}

      {gasit && (
        <div className="doc-rezultat">
          <div className="doc-rezultat-cap">
            <Check size={15} /> Date găsite — verifică-le înainte de preluare
          </div>
          {CAMPURI.filter(c => gasit[c.cheie]).map(c => (
            <label key={c.cheie} className="doc-camp">
              <input type="checkbox" checked={!!alese[c.cheie]}
                onChange={e => setAlese(p => ({ ...p, [c.cheie]: e.target.checked }))} />
              <span className="doc-camp-eticheta">{c.eticheta}</span>
              <input className="doc-camp-valoare" value={gasit[c.cheie]}
                onChange={e => setGasit(p => ({ ...p, [c.cheie]: e.target.value }))} />
            </label>
          ))}
          {gasit.cnp && gasit._cnpValid === false && (
            <div className="doc-mesaj atentie">
              <AlertTriangle size={15} /> <span>CNP-ul citit pare incorect. Verifică-l cu atenție înainte de preluare.</span>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button type="button" className="btn btn-primary btn-sm gap-1.5" onClick={preia}>
              <Check size={13} /> Preia datele bifate
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setGasit(null)}>
              <X size={13} /> Renunță
            </button>
          </div>
        </div>
      )}

      {imagine && !compact && (
        <div className="doc-pastrare">
          <label className="doc-acord">
            <input type="checkbox" checked={acord} onChange={e => setAcord(e.target.checked)} />
            <span>
              Sunt de acord ca o copie a actului să fie păstrată în evidența asociației,
              pentru întocmirea contractului de voluntariat. Copia poate fi ștearsă oricând, la cerere.
            </span>
          </label>
          {urcat ? (
            <div className="doc-mesaj bun"><Check size={15} /> <span>Copia actului a fost atașată înregistrării.</span></div>
          ) : (
            <button type="button" className="btn btn-outline btn-sm" onClick={urcaDocument} disabled={!acord || lucreaza}>
              Atașează copia actului
            </button>
          )}
        </div>
      )}
    </div>
  )
}
