import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, SectionTitle, FormGroup } from '../components/ui'
import { CheckCircle } from 'lucide-react'

const ROLURI = [
  'coordonator echipă',
  'organizare și susținere atelier',
  'media/foto-video',
  'activități sportive și aventură',
  'treasure-hunt',
  'departament administrativ',
]

function calcMinor(cnp) {
  if (!cnp || cnp.length < 7) return false
  const sex = parseInt(cnp[0])
  const an = parseInt(cnp.slice(1, 3))
  let anNastere
  if (sex <= 2) anNastere = 1900 + an
  else if (sex <= 4) anNastere = 1800 + an
  else anNastere = 2000 + an
  return (new Date().getFullYear() - anNastere) < 18
}

export default function Inrolare() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const sigRef = useRef(null)
  const sigDrawing = useRef(false)

  const isMinor = calcMinor(data.cnp || '')

  function update(field, value) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function stepClass(n) {
    if (n < step) return 'done'
    if (n === step) return 'active'
    return ''
  }

  // ── STEP 1 — Date personale ──────────────────────────────────
  function Step1() {
    const [local, setLocal] = useState({ ...data })
    function upd(f, v) { setLocal(p => ({ ...p, [f]: v })) }

    function next() {
      if (!local.nume || !local.cnp || !local.localitate || !local.ci_serie || !local.ci_numar || !local.ci_eliberat) {
        alert('Completați câmpurile obligatorii (*)'); return
      }
      setData(p => ({ ...p, ...local }))
      setStep(2)
    }

    const minor = calcMinor(local.cnp || '')

    return (
      <div>
        <SectionTitle>Date conform act de identitate</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormGroup label="Nume și prenume" required>
              <input className="form-input" value={local.nume || ''} onChange={e => upd('nume', e.target.value)} placeholder="Ex: Ionescu Alexandra Maria" />
            </FormGroup>
          </div>
          <FormGroup label="CNP" required>
            <input className="form-input font-mono" maxLength={13} value={local.cnp || ''} onChange={e => upd('cnp', e.target.value)} placeholder="13 cifre" />
            {local.cnp?.length === 13 && (
              <span className={`text-xs mt-0.5 ${minor ? 'text-amber-600' : 'text-green-600'}`}>
                {minor ? '⚠️ Voluntar minor — se solicită datele părintelui/tutorelui' : '✓ Voluntar major'}
              </span>
            )}
          </FormGroup>
          <FormGroup label="Data nașterii">
            <input className="form-input" type="date" value={local.data_nasterii || ''} onChange={e => upd('data_nasterii', e.target.value)} />
          </FormGroup>
          <FormGroup label="Localitate domiciliu" required>
            <input className="form-input" value={local.localitate || ''} onChange={e => upd('localitate', e.target.value)} placeholder="Ex: Pașcani" />
          </FormGroup>
          <FormGroup label="Adresă completă">
            <input className="form-input" value={local.adresa || ''} onChange={e => upd('adresa', e.target.value)} placeholder="Str., nr., bl., ap." />
          </FormGroup>
          <FormGroup label="Telefon">
            <input className="form-input" value={local.telefon || ''} onChange={e => upd('telefon', e.target.value)} placeholder="07xx xxx xxx" />
          </FormGroup>
          <FormGroup label="Email">
            <input className="form-input" type="email" value={local.email || ''} onChange={e => upd('email', e.target.value)} placeholder="adresa@email.ro" />
          </FormGroup>
        </div>

        <SectionTitle>Act de identitate</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          <FormGroup label="Seria" required>
            <input className="form-input" maxLength={2} value={local.ci_serie || ''} onChange={e => upd('ci_serie', e.target.value.toUpperCase())} placeholder="Ex: IS" />
          </FormGroup>
          <FormGroup label="Numărul" required>
            <input className="form-input" value={local.ci_numar || ''} onChange={e => upd('ci_numar', e.target.value)} placeholder="Ex: 123456" />
          </FormGroup>
          <FormGroup label="Data eliberării">
            <input className="form-input" type="date" value={local.ci_data_elib || ''} onChange={e => upd('ci_data_elib', e.target.value)} />
          </FormGroup>
          <div className="col-span-3">
            <FormGroup label="Eliberat de" required>
              <input className="form-input" value={local.ci_eliberat || ''} onChange={e => upd('ci_eliberat', e.target.value)} placeholder="Ex: SPCLEP Pașcani" />
            </FormGroup>
          </div>
        </div>

        {minor && (
          <>
            <SectionTitle>⚠️ Date părinte / tutore (voluntar minor)</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormGroup label="Nume și prenume părinte/tutore">
                  <input className="form-input" value={local.parinte_nume || ''} onChange={e => upd('parinte_nume', e.target.value)} placeholder="Numele complet al părintelui" />
                </FormGroup>
              </div>
              <FormGroup label="CNP părinte">
                <input className="form-input font-mono" maxLength={13} value={local.parinte_cnp || ''} onChange={e => upd('parinte_cnp', e.target.value)} />
              </FormGroup>
              <FormGroup label="Telefon">
                <input className="form-input" value={local.parinte_telefon || ''} onChange={e => upd('parinte_telefon', e.target.value)} placeholder="07xx xxx xxx" />
              </FormGroup>
              <FormGroup label="Serie CI">
                <input className="form-input" maxLength={2} value={local.parinte_ci_serie || ''} onChange={e => upd('parinte_ci_serie', e.target.value.toUpperCase())} />
              </FormGroup>
              <FormGroup label="Număr CI">
                <input className="form-input" value={local.parinte_ci_numar || ''} onChange={e => upd('parinte_ci_numar', e.target.value)} />
              </FormGroup>
              <div className="col-span-2">
                <FormGroup label="Eliberat de">
                  <input className="form-input" value={local.parinte_ci_elib || ''} onChange={e => upd('parinte_ci_elib', e.target.value)} />
                </FormGroup>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end mt-6">
          <button className="btn btn-primary" onClick={next}>Continuă →</button>
        </div>
      </div>
    )
  }

  // ── STEP 2 — Profil ──────────────────────────────────────────
  function Step2() {
    const [local, setLocal] = useState({ ...data })
    function upd(f, v) { setLocal(p => ({ ...p, [f]: v })) }

    function next() {
      if (!local.institutie) { alert('Completați instituția/locul de muncă'); return }
      setData(p => ({ ...p, ...local }))
      setStep(3)
    }

    return (
      <div>
        <SectionTitle>Instituție / Loc de muncă</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Tip" required>
            <select className="form-select" value={local.tip_institutie || 'scoala'} onChange={e => upd('tip_institutie', e.target.value)}>
              <option value="scoala">Elev / Student</option>
              <option value="angajat">Angajat</option>
              <option value="liber">Liber profesionist</option>
              <option value="altul">Altul</option>
            </select>
          </FormGroup>
          <FormGroup label="Denumire instituție" required>
            <input className="form-input" value={local.institutie || ''} onChange={e => upd('institutie', e.target.value)} placeholder="Ex: Liceul Teoretic, SC Firma SRL" />
          </FormGroup>
        </div>

        <SectionTitle>Descriere personală & Abilități</SectionTitle>
        <div className="space-y-4">
          <FormGroup label="Pasiuni și preocupări preferate" required>
            <textarea className="form-textarea" value={local.pasiuni || ''} onChange={e => upd('pasiuni', e.target.value)} placeholder="Ex: fotografie, muzică, sport, voluntariat..." />
          </FormGroup>
          <FormGroup label="La ce activități te aștepți să participi?">
            <textarea className="form-textarea" value={local.asteptari_act || ''} onChange={e => upd('asteptari_act', e.target.value)} placeholder="Descrie tipul de activități la care te-ai implica..." />
          </FormGroup>
          <FormGroup label="Așteptări legate de participarea în asociație">
            <textarea className="form-textarea" value={local.asteptari_asoc || ''} onChange={e => upd('asteptari_asoc', e.target.value)} placeholder="Ce îți dorești să câștigii din această experiență?" />
          </FormGroup>
          <FormGroup label="Cum crezi că poți contribui?" required>
            <textarea className="form-textarea" value={local.contributie || ''} onChange={e => upd('contributie', e.target.value)} placeholder="Abilități, cunoștințe, timp disponibil..." />
          </FormGroup>
        </div>

        <div className="flex justify-between mt-6">
          <button className="btn btn-outline" onClick={() => setStep(1)}>← Înapoi</button>
          <button className="btn btn-primary" onClick={next}>Continuă →</button>
        </div>
      </div>
    )
  }

  // ── STEP 3 — Chestionar ──────────────────────────────────────
  function Step3() {
    const [local, setLocal] = useState({ ...data })
    function upd(f, v) { setLocal(p => ({ ...p, [f]: v })) }
    function toggleRol(r) {
      const current = local.rol_dorit || []
      upd('rol_dorit', current.includes(r) ? current.filter(x => x !== r) : [...current, r])
    }

    function next() {
      if (!local.motivatie) { alert('Completați motivația personală'); return }
      setData(p => ({ ...p, ...local }))
      setStep(4)
    }

    return (
      <div>
        <SectionTitle>Experiență anterioară în voluntariat</SectionTitle>
        <FormGroup label="Dacă ai mai fost voluntar, enumeră ultimele 3 activități/proiecte"
          hint="Ex: 1. Proiect Natura Verde, coordonator logistică, activități de plantare...">
          <textarea className="form-textarea" value={local.experienta_anterioara || ''} onChange={e => upd('experienta_anterioara', e.target.value)} placeholder="Dacă nu ai experiență anterioară, scrie: Nicio experiență anterioară." />
        </FormGroup>

        <div className="mt-4">
          <FormGroup label="Motivația ta personală" required hint="De ce îți dorești să faci parte din echipa asociației?">
            <textarea className="form-textarea" value={local.motivatie || ''} onChange={e => upd('motivatie', e.target.value)} placeholder="Scrie motivația ta sinceră..." />
          </FormGroup>
        </div>

        <SectionTitle>Rol dorit în echipă</SectionTitle>
        <div className="space-y-2">
          {ROLURI.map(r => (
            <label key={r} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all" style={{ '--tw-bg-opacity': 1 }}>
              <input type="checkbox" className="w-4 h-4 accent-green-700"
                checked={(local.rol_dorit || []).includes(r)}
                onChange={() => toggleRol(r)} />
              <span className="text-sm">{r}</span>
            </label>
          ))}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
            <input type="checkbox" className="w-4 h-4" id="altul-check"
              checked={!!local.rol_altul}
              onChange={e => !e.target.checked && upd('rol_altul', '')} />
            <label htmlFor="altul-check" className="text-sm">Altul:</label>
            <input className="form-input flex-1" value={local.rol_altul || ''} onChange={e => upd('rol_altul', e.target.value)} placeholder="Specifică..." />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button className="btn btn-outline" onClick={() => setStep(2)}>← Înapoi</button>
          <button className="btn btn-primary" onClick={next}>Continuă →</button>
        </div>
      </div>
    )
  }

  // ── STEP 4 — Contract & Semnătură ────────────────────────────
  function Step4() {
    const [sigMode, setSigMode] = useState('draw')
    const canvasRef = useRef(null)
    const drawing = useRef(false)

    const azi = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })

    function initCanvas(canvas) {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#1a1f1c'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      function pos(e) {
        const r = canvas.getBoundingClientRect()
        const src = e.touches ? e.touches[0] : e
        return [src.clientX - r.left, src.clientY - r.top]
      }
      canvas.onmousedown = e => { drawing.current = true; ctx.beginPath(); ctx.moveTo(...pos(e)) }
      canvas.onmousemove = e => { if (!drawing.current) return; ctx.lineTo(...pos(e)); ctx.stroke() }
      canvas.onmouseup = () => drawing.current = false
      canvas.ontouchstart = e => { e.preventDefault(); drawing.current = true; ctx.beginPath(); ctx.moveTo(...pos(e)) }
      canvas.ontouchmove = e => { e.preventDefault(); if (!drawing.current) return; ctx.lineTo(...pos(e)); ctx.stroke() }
      canvas.ontouchend = () => drawing.current = false
    }

    async function finalizeaza() {
      setSaving(true)
      const payload = {
        nume: data.nume, cnp: data.cnp, data_nasterii: data.data_nasterii || null,
        localitate: data.localitate, adresa: data.adresa, telefon: data.telefon, email: data.email,
        minor: calcMinor(data.cnp || ''),
        ci_serie: data.ci_serie, ci_numar: data.ci_numar, ci_eliberat: data.ci_eliberat, ci_data_elib: data.ci_data_elib || null,
        parinte_nume: data.parinte_nume, parinte_cnp: data.parinte_cnp, parinte_telefon: data.parinte_telefon,
        parinte_ci_serie: data.parinte_ci_serie, parinte_ci_numar: data.parinte_ci_numar, parinte_ci_elib: data.parinte_ci_elib,
        tip_institutie: data.tip_institutie, institutie: data.institutie,
        pasiuni: data.pasiuni, asteptari_act: data.asteptari_act, asteptari_asoc: data.asteptari_asoc, contributie: data.contributie,
        experienta_anterioara: data.experienta_anterioara, motivatie: data.motivatie,
        rol_dorit: data.rol_dorit || [], rol_altul: data.rol_altul,
        status: 'activ', ore_totale: 0,
      }

      const { error } = await supabase.from('voluntari').insert(payload)
      if (error) { alert('Eroare la salvare: ' + error.message); setSaving(false); return }
      setDone(true)
      setSaving(false)
    }

    return (
      <div>
        <SectionTitle>Previzualizare contract</SectionTitle>
        <div className="rounded-xl border p-6 text-sm leading-relaxed mb-6" style={{ background: '#fffef7', borderColor: '#e8dfa0', fontFamily: 'DM Serif Display, serif' }}>
          <p className="text-center text-xs opacity-60 mb-3">ASOCIAȚIA "ȘANSA 2010" · CIF 27772126 · Pașcani, Iași</p>
          <p className="text-center text-base font-bold mb-1">Contract de voluntariat</p>
          <p className="text-center text-xs opacity-50 mb-4">Nr. _____ / {azi}</p>
          <p><strong>I. Părțile</strong></p>
          <p className="mt-1">a. Asociația "ȘANSA 2010", reprezentată prin <strong>Spiridon Mihaela-Iulia</strong>, Președinte</p>
          <p className="mt-1">și</p>
          <p className="mt-1">b. Voluntarul: <span className="bg-yellow-100 px-1 rounded">{data.nume}</span>, CNP <span className="bg-yellow-100 px-1 rounded font-mono">{data.cnp}</span>, domiciliat în <span className="bg-yellow-100 px-1 rounded">{data.localitate}</span>, tel <span className="bg-yellow-100 px-1 rounded">{data.telefon}</span>, posesor(are) CI seria <span className="bg-yellow-100 px-1 rounded">{data.ci_serie}</span> nr. <span className="bg-yellow-100 px-1 rounded">{data.ci_numar}</span>, eliberat de <span className="bg-yellow-100 px-1 rounded">{data.ci_eliberat}</span></p>
          {isMinor && data.parinte_nume && (
            <p className="mt-1">cu acordul părintelui/tutorelui: <span className="bg-yellow-100 px-1 rounded">{data.parinte_nume}</span></p>
          )}
          <p className="mt-3 text-xs opacity-50">... [clauzele contractului conform Legii 78/2014] ...</p>
          <p className="mt-3">Încheiat astăzi, <strong>{azi}</strong>, în două exemplare.</p>
        </div>

        <SectionTitle>Semnătură voluntar</SectionTitle>
        <div className="flex gap-3 mb-4">
          <button onClick={() => setSigMode('draw')} className={`btn btn-sm ${sigMode === 'draw' ? 'btn-primary' : 'btn-outline'}`}>✏️ Semnează digital</button>
          <button onClick={() => setSigMode('print')} className={`btn btn-sm ${sigMode === 'print' ? 'btn-primary' : 'btn-outline'}`}>🖨️ Tipărire fizică</button>
        </div>

        {sigMode === 'draw' ? (
          <div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden" style={{ background: '#fafbfa' }}>
              <canvas ref={el => { canvasRef.current = el; initCanvas(el) }} width={580} height={120} className="block cursor-crosshair w-full" />
              <p className="text-center text-xs text-gray-400 py-2">Semnează cu mouse-ul sau degetul</p>
            </div>
            <button className="btn btn-outline btn-sm mt-2" onClick={() => {
              const ctx = canvasRef.current?.getContext('2d')
              if (ctx) ctx.clearRect(0, 0, 580, 120)
            }}>✕ Șterge</button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            📄 Contractul va fi generat și tipărit. Semnătura se aplică fizic.
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <button className="btn btn-outline" onClick={() => setStep(3)}>← Înapoi</button>
          <div className="flex gap-3">
            <button className="btn btn-outline" onClick={() => alert('📄 Contract PDF descărcat!')}>⬇ Descarcă PDF</button>
            <button className="btn btn-primary" onClick={finalizeaza} disabled={saving}>
              {saving ? '⏳ Se salvează...' : '✓ Finalizează înrolarea'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── DONE ─────────────────────────────────────────────────────
  if (done) return (
    <div className="p-8">
      <div className="card text-center py-16 max-w-lg mx-auto">
        <CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#1a6b4a' }} />
        <h2 className="font-serif text-2xl mb-2">Voluntar înrolat cu succes!</h2>
        <p className="text-gray-500 mb-6">{data.nume} a fost adăugat în baza de date.</p>
        <div className="flex gap-3 justify-center">
          <button className="btn btn-outline" onClick={() => navigate('/voluntari')}>Vezi lista voluntarilor</button>
          <button className="btn btn-primary" onClick={() => { setStep(1); setData({}); setDone(false) }}>+ Înrolează alt voluntar</button>
        </div>
      </div>
    </div>
  )

  const steps = ['Date personale', 'Profil & Instituție', 'Chestionar', 'Contract & Finalizare']

  return (
    <>
      <PageHeader title="Înrolare voluntar nou" subtitle="Completează datele în 4 pași" />
      <div className="p-8">
        <div className="card max-w-3xl">
          {/* Step indicator */}
          <div className="flex items-center mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className={`step-item ${stepClass(i + 1)}`}>
                  <div className="step-num">{i < step - 1 ? '✓' : i + 1}</div>
                  <span className="text-xs whitespace-nowrap">{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`step-line ${i < step - 1 ? 'done' : ''}`} />}
              </div>
            ))}
          </div>

          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
        </div>
      </div>
    </>
  )
}
