import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
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

function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <span className="text-xs text-gray-400 italic">{hint}</span>}
    </div>
  )
}

export default function InrolarePublica() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const isMinor = calcMinor(data.cnp || '')

  function upd(field, value) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const steps = ['Date personale', 'Profil', 'Chestionar']

  function StepIndicator() {
    return (
      <div className="flex items-center justify-center mb-8 gap-0">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i < step - 1 ? 'bg-green-600 border-green-600 text-white' :
                i === step - 1 ? 'border-green-600 text-green-600' :
                'border-gray-300 text-gray-400'
              }`}>
                {i < step - 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${i === step - 1 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 mb-4 ${i < step - 1 ? 'bg-green-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  // ── STEP 1 ───────────────────────────────────────────────────
  function Step1() {
    const [local, setLocal] = useState({ ...data })
    const upd1 = (f, v) => setLocal(p => ({ ...p, [f]: v }))
    const minor = calcMinor(local.cnp || '')

    function next() {
      if (!local.nume || !local.cnp || !local.localitate || !local.ci_serie || !local.ci_numar || !local.ci_eliberat) {
        setError('Completați câmpurile obligatorii marcate cu *'); return
      }
      setError('')
      setData(p => ({ ...p, ...local }))
      setStep(2)
      window.scrollTo(0, 0)
    }

    return (
      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mt-2">Date conform act de identitate</div>
        <Field label="Nume și prenume" required>
          <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.nume || ''} onChange={e => upd1('nume', e.target.value)} placeholder="Ex: Ionescu Alexandra Maria" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="CNP" required>
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-green-600" maxLength={13} value={local.cnp || ''} onChange={e => upd1('cnp', e.target.value)} placeholder="13 cifre" />
            {local.cnp?.length === 13 && (
              <span className={`text-xs mt-0.5 ${calcMinor(local.cnp) ? 'text-amber-600 font-medium' : 'text-green-600'}`}>
                {calcMinor(local.cnp) ? '⚠️ Voluntar minor — se solicită datele părintelui' : '✓ Voluntar major'}
              </span>
            )}
          </Field>
          <Field label="Data nașterii">
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" type="date" value={local.data_nasterii || ''} onChange={e => upd1('data_nasterii', e.target.value)} />
          </Field>
        </div>
        <Field label="Localitate domiciliu" required>
          <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.localitate || ''} onChange={e => upd1('localitate', e.target.value)} placeholder="Ex: Pașcani" />
        </Field>
        <Field label="Adresă completă">
          <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.adresa || ''} onChange={e => upd1('adresa', e.target.value)} placeholder="Str., nr., bl., ap." />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Telefon">
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.telefon || ''} onChange={e => upd1('telefon', e.target.value)} placeholder="07xx xxx xxx" />
          </Field>
          <Field label="Email">
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" type="email" value={local.email || ''} onChange={e => upd1('email', e.target.value)} placeholder="adresa@email.ro" />
          </Field>
        </div>

        <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mt-4">Act de identitate</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Seria" required>
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" maxLength={2} value={local.ci_serie || ''} onChange={e => upd1('ci_serie', e.target.value.toUpperCase())} placeholder="IS" />
          </Field>
          <Field label="Numărul" required>
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.ci_numar || ''} onChange={e => upd1('ci_numar', e.target.value)} placeholder="123456" />
          </Field>
          <Field label="Data eliberării">
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" type="date" value={local.ci_data_elib || ''} onChange={e => upd1('ci_data_elib', e.target.value)} />
          </Field>
        </div>
        <Field label="Eliberat de" required>
          <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.ci_eliberat || ''} onChange={e => upd1('ci_eliberat', e.target.value)} placeholder="Ex: SPCLEP Pașcani" />
        </Field>

        {minor && (
          <>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-600 border-b-2 border-amber-100 pb-1.5 mt-4">⚠️ Date părinte / tutore (voluntar minor)</div>
            <Field label="Nume și prenume părinte/tutore">
              <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.parinte_nume || ''} onChange={e => upd1('parinte_nume', e.target.value)} placeholder="Numele complet al părintelui" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="CNP părinte">
                <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-green-600" maxLength={13} value={local.parinte_cnp || ''} onChange={e => upd1('parinte_cnp', e.target.value)} />
              </Field>
              <Field label="Telefon">
                <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.parinte_telefon || ''} onChange={e => upd1('parinte_telefon', e.target.value)} />
              </Field>
              <Field label="Serie CI">
                <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" maxLength={2} value={local.parinte_ci_serie || ''} onChange={e => upd1('parinte_ci_serie', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Număr CI">
                <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.parinte_ci_numar || ''} onChange={e => upd1('parinte_ci_numar', e.target.value)} />
              </Field>
            </div>
            <Field label="CI eliberat de">
              <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.parinte_ci_elib || ''} onChange={e => upd1('parinte_ci_elib', e.target.value)} />
            </Field>
          </>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        <button onClick={next} className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all" style={{ background: '#1a6b4a' }}>
          Continuă →
        </button>
      </div>
    )
  }

  // ── STEP 2 ───────────────────────────────────────────────────
  function Step2() {
    const [local, setLocal] = useState({ ...data })
    const upd2 = (f, v) => setLocal(p => ({ ...p, [f]: v }))

    function next() {
      if (!local.institutie || !local.pasiuni || !local.contributie) {
        setError('Completați câmpurile obligatorii marcate cu *'); return
      }
      setError('')
      setData(p => ({ ...p, ...local }))
      setStep(3)
      window.scrollTo(0, 0)
    }

    return (
      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5">Instituție / Loc de muncă</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tip" required>
            <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-green-600" value={local.tip_institutie || 'scoala'} onChange={e => upd2('tip_institutie', e.target.value)}>
              <option value="scoala">Elev / Student</option>
              <option value="angajat">Angajat</option>
              <option value="liber">Liber profesionist</option>
              <option value="altul">Altul</option>
            </select>
          </Field>
          <Field label="Denumire instituție" required>
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600" value={local.institutie || ''} onChange={e => upd2('institutie', e.target.value)} placeholder="Ex: Liceul Teoretic..." />
          </Field>
        </div>

        <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mt-4">Profil personal</div>
        <Field label="Pasiuni și preocupări preferate" required>
          <textarea className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 resize-y min-h-[80px]" value={local.pasiuni || ''} onChange={e => upd2('pasiuni', e.target.value)} placeholder="Ex: fotografie, muzică, sport, voluntariat..." />
        </Field>
        <Field label="La ce activități te aștepți să participi?">
          <textarea className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 resize-y min-h-[80px]" value={local.asteptari_act || ''} onChange={e => upd2('asteptari_act', e.target.value)} placeholder="Tipul de activități la care te-ai implica..." />
        </Field>
        <Field label="Așteptări legate de asociație">
          <textarea className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 resize-y min-h-[80px]" value={local.asteptari_asoc || ''} onChange={e => upd2('asteptari_asoc', e.target.value)} placeholder="Ce îți dorești să câștigii din această experiență?" />
        </Field>
        <Field label="Cum crezi că poți contribui?" required>
          <textarea className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 resize-y min-h-[80px]" value={local.contributie || ''} onChange={e => upd2('contributie', e.target.value)} placeholder="Abilități, cunoștințe, timp disponibil..." />
        </Field>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        <div className="flex gap-3">
          <button onClick={() => { setStep(1); window.scrollTo(0,0) }} className="flex-1 py-3 rounded-xl font-semibold text-sm border border-gray-300 text-gray-600 bg-white">← Înapoi</button>
          <button onClick={next} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm" style={{ background: '#1a6b4a' }}>Continuă →</button>
        </div>
      </div>
    )
  }

  // ── STEP 3 ───────────────────────────────────────────────────
  function Step3() {
    const [local, setLocal] = useState({ ...data })
    const upd3 = (f, v) => setLocal(p => ({ ...p, [f]: v }))

    function toggleRol(r) {
      const current = local.rol_dorit || []
      upd3('rol_dorit', current.includes(r) ? current.filter(x => x !== r) : [...current, r])
    }

    async function submit() {
      if (!local.motivatie) { setError('Completați motivația personală'); return }
      setSaving(true); setError('')
      const finalData = { ...data, ...local }

      const payload = {
        nume: finalData.nume, cnp: finalData.cnp,
        data_nasterii: finalData.data_nasterii || null,
        localitate: finalData.localitate, adresa: finalData.adresa,
        telefon: finalData.telefon, email: finalData.email,
        minor: calcMinor(finalData.cnp || ''),
        ci_serie: finalData.ci_serie, ci_numar: finalData.ci_numar,
        ci_eliberat: finalData.ci_eliberat, ci_data_elib: finalData.ci_data_elib || null,
        parinte_nume: finalData.parinte_nume, parinte_cnp: finalData.parinte_cnp,
        parinte_telefon: finalData.parinte_telefon,
        parinte_ci_serie: finalData.parinte_ci_serie,
        parinte_ci_numar: finalData.parinte_ci_numar,
        parinte_ci_elib: finalData.parinte_ci_elib,
        tip_institutie: finalData.tip_institutie, institutie: finalData.institutie,
        pasiuni: finalData.pasiuni, asteptari_act: finalData.asteptari_act,
        asteptari_asoc: finalData.asteptari_asoc, contributie: finalData.contributie,
        experienta_anterioara: finalData.experienta_anterioara,
        motivatie: finalData.motivatie,
        rol_dorit: finalData.rol_dorit || [],
        rol_altul: finalData.rol_altul,
        status: 'activ', ore_totale: 0,
      }

      const { error } = await supabase.from('voluntari').insert(payload)
      if (error) {
        setError(error.code === '23505' ? 'Există deja un voluntar înregistrat cu acest CNP.' : 'Eroare la trimitere. Încearcă din nou.')
        setSaving(false); return
      }
      setDone(true)
      setSaving(false)
    }

    return (
      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5">Experiență anterioară</div>
        <Field label="Dacă ai mai fost voluntar, descrie ultimele 3 activități" hint="Ex: 1. Proiect Natura Verde, coordonator logistică...">
          <textarea className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 resize-y min-h-[80px]" value={local.experienta_anterioara || ''} onChange={e => upd3('experienta_anterioara', e.target.value)} placeholder="Dacă nu ai experiență anterioară, scrie: Nicio experiență anterioară." />
        </Field>
        <Field label="Motivația ta personală" required hint="De ce îți dorești să faci parte din echipa asociației?">
          <textarea className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-600 resize-y min-h-[80px]" value={local.motivatie || ''} onChange={e => upd3('motivatie', e.target.value)} placeholder="Scrie motivația ta sinceră..." />
        </Field>

        <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mt-2">Rol dorit în echipă</div>
        <div className="space-y-2">
          {ROLURI.map(r => (
            <label key={r} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
              <input type="checkbox" className="w-4 h-4 flex-shrink-0" style={{ accentColor: '#1a6b4a' }}
                checked={(local.rol_dorit || []).includes(r)}
                onChange={() => toggleRol(r)} />
              <span className="text-sm">{r}</span>
            </label>
          ))}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
            <input type="checkbox" className="w-4 h-4 flex-shrink-0" checked={!!local.rol_altul} onChange={e => !e.target.checked && upd3('rol_altul', '')} />
            <span className="text-sm flex-shrink-0">Altul:</span>
            <input className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-green-600" value={local.rol_altul || ''} onChange={e => upd3('rol_altul', e.target.value)} placeholder="Specifică..." />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        <div className="flex gap-3">
          <button onClick={() => { setStep(2); window.scrollTo(0,0) }} className="flex-1 py-3 rounded-xl font-semibold text-sm border border-gray-300 text-gray-600 bg-white">← Înapoi</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all" style={{ background: '#1a6b4a', opacity: saving ? 0.7 : 1 }}>
            {saving ? '⏳ Se trimite...' : '✓ Trimite înrolarea'}
          </button>
        </div>
      </div>
    )
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f4f6f5' }}>
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
        <CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#1a6b4a' }} />
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'DM Serif Display, serif', color: '#1a6b4a' }}>
          Înrolare trimisă cu succes!
        </h2>
        <p className="text-gray-600 mb-2">Mulțumim, <strong>{data.nume}</strong>!</p>
        <p className="text-gray-500 text-sm mb-6">Datele tale au fost înregistrate. Echipa Asociației ȘANSA 2010 te va contacta în curând.</p>
        <div className="text-xs text-gray-400">
          asociatia.sansa2010@gmail.com · 0723 276029
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#f4f6f5' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: '#1a6b4a' }}>
            <span className="text-white text-2xl">🌱</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'DM Serif Display, serif', color: '#1a6b4a' }}>
            Asociația ȘANSA 2010
          </h1>
          <p className="text-gray-500 text-sm mt-1">Formular de înrolare voluntar</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <StepIndicator />
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          CIF 27772126 · Str. Grădiniței 22, Pașcani, Iași<br />
          Datele sunt prelucrate conform GDPR și Legii 78/2014
        </p>
      </div>
    </div>
  )
}
