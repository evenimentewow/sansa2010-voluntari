import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { Printer, Plus, UserCheck, Trash2, Download, Share2, Hash, MessageCircle, Mail, Pencil, ShieldAlert, Search } from 'lucide-react'

const AN = new Date().getFullYear()

const fmt = n => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2 }).format(n || 0)
const dataRo = d => new Date(d || Date.now()).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })

// Seria = PREFIX + AN  (ex: SNS2026),  numarul = 001
const serieCod = (prefix, an) => `${(prefix || 'SNS').toUpperCase()}${an || AN}`
const nrDoc = numar => String(numar || 0).padStart(3, '0')
const docFull = (prefix, an, numar) => `${serieCod(prefix, an)} nr. ${nrDoc(numar)}`

const UNI = ['zero','unu','doi','trei','patru','cinci','sase','sapte','opt','noua','zece','unsprezece','doisprezece','treisprezece','paisprezece','cincisprezece','saisprezece','saptesprezece','optsprezece','nouasprezece']
const ZECI = ['','','douazeci','treizeci','patruzeci','cincizeci','saizeci','saptezeci','optzeci','nouazeci']
function subMie(n) {
  let s = ''
  const sute = Math.floor(n / 100), rest = n % 100
  if (sute === 1) s += 'osuta '
  else if (sute > 1) s += `${UNI[sute]}sute `
  if (rest < 20 && rest > 0) s += UNI[rest]
  else if (rest >= 20) {
    s += ZECI[Math.floor(rest / 10)]
    if (rest % 10) s += `si${UNI[rest % 10]}`
  }
  return s.trim()
}
function inLitere(n) {
  n = Math.floor(Math.abs(n || 0))
  if (n === 0) return 'zero'
  const mii = Math.floor(n / 1000), rest = n % 1000
  let s = ''
  if (mii === 1) s += 'omie '
  else if (mii > 1) s += `${subMie(mii)}mii `
  if (rest) s += subMie(rest)
  return s.trim()
}

const GOL = {
  sponsor_denumire: '', sponsor_sediu: '', sponsor_reg_com: '', sponsor_cui: '',
  sponsor_cont: '', sponsor_banca: '', sponsor_reprezentant: '',
  sponsor_ci_serie: '', sponsor_ci_numar: '', sponsor_cnp: '', sponsor_calitate: 'administrator',
  suma: '', data_limita: '', are_chitanta: false, semnatar1_id: '', semnatar2_id: '',
}

export default function Sponsorizari() {
  const { user } = useAuth()
  const isGuest = user?.rol === 'guest'
  const isAdmin = !!user && !isGuest

  const [sponsorizari, setSponsorizari] = useState([])
  const [imputerniciti, setImputerniciti] = useState([])
  const [serii, setSerii] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImp, setShowImp] = useState(false)
  const [showSerii, setShowSerii] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const [editId, setEditId] = useState(null)          // godmode: contract in editare
  const [impNou, setImpNou] = useState({ nume: '', functie: 'imputernicit' })
  const [form, setForm] = useState(GOL)
  const [anaf, setAnaf] = useState({ loading: false, msg: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [sp, imp, ser] = await Promise.all([
      supabase.from('sponsorizari').select('*').order('numar', { ascending: false }),
      supabase.from('imputerniciti').select('*').eq('activ', true).order('created_at'),
      supabase.from('serii').select('*').order('an', { ascending: false }),
    ])
    setSponsorizari(sp.data || [])
    setImputerniciti(imp.data || [])
    setSerii(ser.data || [])
    setLoading(false)
  }

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }))

  // ── Preluare date firma de la ANAF / Registrul Comertului ──────
  async function cautaCui() {
    const cui = String(form.sponsor_cui || '').replace(/[^0-9]/g, '')
    if (!cui) { setAnaf({ loading: false, msg: 'Introduceți CUI-ul firmei' }); return }
    setAnaf({ loading: true, msg: '' })
    try {
      const r = await fetch(`/api/anaf?cui=${cui}`)
      const d = await r.json()
      if (!r.ok) { setAnaf({ loading: false, msg: d.error || 'Firma nu a fost găsită' }); return }
      setForm(p => ({
        ...p,
        sponsor_denumire: d.denumire || p.sponsor_denumire,
        sponsor_sediu: d.adresa || p.sponsor_sediu,
        sponsor_reg_com: d.nrRegCom || p.sponsor_reg_com,
        sponsor_cui: d.cui || p.sponsor_cui,
      }))
      setAnaf({ loading: false, msg: `✓ Date preluate${d.stare ? ` · ${d.stare}` : ''}` })
    } catch (e) {
      setAnaf({ loading: false, msg: 'Serviciul ANAF nu răspunde. Completați manual.' })
    }
  }
  const serieContract = serii.find(s => s.tip === 'contract' && s.an === AN)
  const serieChitanta = serii.find(s => s.tip === 'chitanta' && s.an === AN)

  async function salveazaSerie(tip, prefix, numar_start) {
    const ex = serii.find(s => s.tip === tip && s.an === AN)
    if (ex) await supabase.from('serii').update({ prefix, numar_start }).eq('id', ex.id)
    else await supabase.from('serii').insert({ tip, an: AN, prefix, numar_start })
    fetchAll()
  }

  async function adaugaImputernicit() {
    if (!impNou.nume) return alert('Completați numele')
    const { error } = await supabase.from('imputerniciti').insert(impNou)
    if (error) return alert('Eroare: ' + error.message)
    setImpNou({ nume: '', functie: 'imputernicit' })
    fetchAll()
  }
  async function stergeImputernicit(id) {
    if (!confirm('Dezactivezi această persoană?')) return
    await supabase.from('imputerniciti').update({ activ: false }).eq('id', id)
    fetchAll()
  }

  // ── GODMODE: editare / stergere ────────────────────────────────
  function deschideEditare(c) {
    const s1 = imputerniciti.find(i => i.nume === c.semnatar1_nume)
    const s2 = imputerniciti.find(i => i.nume === c.semnatar2_nume)
    setForm({
      sponsor_denumire: c.sponsor_denumire || '', sponsor_sediu: c.sponsor_sediu || '',
      sponsor_reg_com: c.sponsor_reg_com || '', sponsor_cui: c.sponsor_cui || '',
      sponsor_cont: c.sponsor_cont || '', sponsor_banca: c.sponsor_banca || '',
      sponsor_reprezentant: c.sponsor_reprezentant || '', sponsor_ci_serie: c.sponsor_ci_serie || '',
      sponsor_ci_numar: c.sponsor_ci_numar || '', sponsor_cnp: c.sponsor_cnp || '',
      sponsor_calitate: c.sponsor_calitate || '', suma: c.suma || '',
      data_limita: c.data_limita || '', are_chitanta: !!c.are_chitanta,
      semnatar1_id: s1?.id || '', semnatar2_id: s2?.id || '',
      numar: c.numar, data_contract: c.data_contract,
    })
    setEditId(c.id)
    setShowForm(true)
    setPreview(null)
    window.scrollTo(0, 0)
  }

  async function stergeContract(c) {
    if (!confirm(`ȘTERGERE DEFINITIVĂ\n\nContract ${docFull(c.serie_prefix, c.serie_an, c.numar)} — ${c.sponsor_denumire}\nSuma: ${fmt(c.suma)} RON\n\nAceastă operațiune nu poate fi anulată. Continui?`)) return
    const { error } = await supabase.from('sponsorizari').delete().eq('id', c.id)
    if (error) return alert('Eroare: ' + error.message)
    if (preview?.id === c.id) setPreview(null)
    fetchAll()
  }

  function anuleazaForm() {
    setShowForm(false); setEditId(null); setForm(GOL)
  }

  async function salveaza() {
    if (!form.sponsor_denumire || !form.suma) return alert('Completați denumirea sponsorului și suma')
    if (!form.semnatar1_id) return alert('Selectați cel puțin un semnatar')
    setSaving(true)

    const s1 = imputerniciti.find(i => i.id === form.semnatar1_id)
    const s2 = form.semnatar2_id ? imputerniciti.find(i => i.id === form.semnatar2_id) : null

    const comun = {
      sponsor_denumire: form.sponsor_denumire, sponsor_sediu: form.sponsor_sediu,
      sponsor_reg_com: form.sponsor_reg_com, sponsor_cui: form.sponsor_cui,
      sponsor_cont: form.sponsor_cont, sponsor_banca: form.sponsor_banca,
      sponsor_reprezentant: form.sponsor_reprezentant, sponsor_ci_serie: form.sponsor_ci_serie,
      sponsor_ci_numar: form.sponsor_ci_numar, sponsor_cnp: form.sponsor_cnp,
      sponsor_calitate: form.sponsor_calitate, suma: parseFloat(form.suma),
      data_limita: form.data_limita || null, are_chitanta: form.are_chitanta,
      semnatar1_nume: s1?.nume || null, semnatar1_functie: s1?.functie || null,
      semnatar2_nume: s2?.nume || null, semnatar2_functie: s2?.functie || null,
    }

    // MODIFICARE (godmode)
    if (editId) {
      const orig = sponsorizari.find(s => s.id === editId)
      let patch = { ...comun }
      if (form.are_chitanta && !orig.chitanta_numar) {
        const { data: chData } = await supabase.rpc('next_numar_chitanta')
        patch.chitanta_numar = Math.max(chData || 1, serieChitanta?.numar_start || 1)
        patch.chitanta_prefix = serieChitanta?.prefix || ''
        patch.chitanta_data = new Date().toISOString().slice(0, 10)
      }
      if (!form.are_chitanta) {
        patch.chitanta_numar = null; patch.chitanta_data = null
      }
      const { data, error } = await supabase.from('sponsorizari').update(patch).eq('id', editId).select().single()
      if (error) { alert('Eroare: ' + error.message); setSaving(false); return }
      setSaving(false); anuleazaForm(); fetchAll(); setPreview(data)
      return
    }

    // CONTRACT NOU
    const { data: nrData } = await supabase.rpc('next_numar_sponsorizare')
    const numar = Math.max(nrData || 1, serieContract?.numar_start || 1)
    let chitanta_numar = null
    if (form.are_chitanta) {
      const { data: chData } = await supabase.rpc('next_numar_chitanta')
      chitanta_numar = Math.max(chData || 1, serieChitanta?.numar_start || 1)
    }

    const payload = {
      ...comun, numar,
      serie_prefix: serieContract?.prefix || 'SNS', serie_an: AN,
      chitanta_prefix: serieChitanta?.prefix || 'CH',
      chitanta_numar,
      chitanta_data: form.are_chitanta ? new Date().toISOString().slice(0, 10) : null,
      introdus_de: user?.email || 'guest',
    }

    const { data, error } = await supabase.from('sponsorizari').insert(payload).select().single()
    if (error) { alert('Eroare: ' + error.message); setSaving(false); return }
    setSaving(false); anuleazaForm(); fetchAll(); setPreview(data)
  }

  // ── Share ──────────────────────────────────────────────────────
  const textContract = c => `CONTRACT DE SPONSORIZARE ${docFull(c.serie_prefix, c.serie_an, c.numar)} din ${dataRo(c.data_contract)}
Sponsor: ${c.sponsor_denumire}${c.sponsor_cui ? ` (CUI ${c.sponsor_cui})` : ''}
Beneficiar: ASOCIATIA SANSA 2010, CIF 27772126
Suma: ${fmt(c.suma)} RON${c.data_limita ? `, termen: ${dataRo(c.data_limita)}` : ''}
Cont: RO58RNCB0176160764990001 (BCR Pascani)${c.are_chitanta ? `\nChitanta: ${docFull(c.chitanta_prefix, c.serie_an, c.chitanta_numar)}` : ''}`

  async function shareContract(c) {
    const text = textContract(c)
    if (navigator.share) { try { await navigator.share({ title: `Contract ${docFull(c.serie_prefix, c.serie_an, c.numar)}`, text }) } catch {} }
    else { await navigator.clipboard.writeText(text); alert('Detaliile au fost copiate. Le poți lipi în WhatsApp sau e-mail.') }
  }
  const shareWhatsapp = c => window.open(`https://wa.me/?text=${encodeURIComponent(textContract(c))}`, '_blank')
  const shareEmail = c => { window.location.href = `mailto:?subject=${encodeURIComponent(`Contract de sponsorizare ${docFull(c.serie_prefix, c.serie_an, c.numar)}`)}&body=${encodeURIComponent(textContract(c))}` }

  if (loading) return <><PageHeader title="Sponsorizări" /><Spinner /></>

  const urmatorulNr = Math.max(...sponsorizari.map(s => s.numar || 0), (serieContract?.numar_start || 1) - 1) + 1

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Contracte de sponsorizare"
          subtitle={`${sponsorizari.length} contracte · seria ${serieCod(serieContract?.prefix, AN)}`}
          actions={
            <>
              {!isGuest && (
                <>
                  <button className="btn btn-outline btn-sm gap-1.5" onClick={() => { setShowSerii(!showSerii); setShowImp(false) }}>
                    <Hash size={14} /> Serii
                  </button>
                  <button className="btn btn-outline btn-sm gap-1.5" onClick={() => { setShowImp(!showImp); setShowSerii(false) }}>
                    <UserCheck size={14} /> Împuterniciți
                  </button>
                </>
              )}
              <button className="btn btn-primary btn-sm gap-1.5" onClick={() => { anuleazaForm(); setShowForm(true) }}>
                <Plus size={14} /> Contract nou
              </button>
            </>
          }
        />
      </div>

      <div className="p-4 sm:p-8 space-y-6">

        {/* SERII */}
        {showSerii && !isGuest && (
          <div className="card no-print" style={{ borderColor: '#3b82f6', borderWidth: 2 }}>
            <div className="card-title">Serii de numerotare — anul {AN}</div>
            <p className="text-sm text-gray-400 mb-4">Seria se formează din prefix + an și apare în antetul documentului.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[{ tip: 'contract', label: 'Contracte', s: serieContract, ex: 'SNS' }, { tip: 'chitanta', label: 'Chitanțe', s: serieChitanta, ex: 'CH' }].map(({ tip, label, s, ex }) => (
                <div key={tip} className="p-4 rounded-lg border border-gray-200">
                  <div className="font-medium text-sm mb-3">{label}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Prefix serie</label>
                      <input className="form-input" defaultValue={s?.prefix || ex} id={`pfx-${tip}`} placeholder={ex} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Număr start</label>
                      <input className="form-input" type="number" defaultValue={s?.numar_start || 1} id={`start-${tip}`} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Va apărea: <strong>{docFull(s?.prefix || ex, AN, s?.numar_start || 1)}</strong></p>
                  <button className="btn btn-outline btn-sm mt-3" onClick={() => salveazaSerie(
                    tip, document.getElementById(`pfx-${tip}`).value,
                    parseInt(document.getElementById(`start-${tip}`).value) || 1
                  )}>Salvează seria</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÎMPUTERNICIȚI */}
        {showImp && !isGuest && (
          <div className="card no-print" style={{ borderColor: '#3b82f6', borderWidth: 2 }}>
            <div className="card-title">Persoane împuternicite cu drept de semnătură</div>
            <div className="flex flex-col sm:flex-row gap-3 my-4">
              <input className="form-input flex-1" placeholder="Nume și prenume" value={impNou.nume} onChange={e => setImpNou(p => ({ ...p, nume: e.target.value }))} />
              <input className="form-input flex-1" placeholder="Funcție" value={impNou.functie} onChange={e => setImpNou(p => ({ ...p, functie: e.target.value }))} />
              <button className="btn btn-primary" onClick={adaugaImputernicit}>+ Adaugă</button>
            </div>
            <div className="space-y-2">
              {imputerniciti.map(i => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div>
                    <div className="font-medium text-sm">{i.nume}</div>
                    <div className="text-xs text-gray-400">{i.functie}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => stergeImputernicit(i.id)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FORMULAR */}
        {showForm && (
          <div className="card no-print" style={editId ? { borderColor: '#c8a84b', borderWidth: 2 } : undefined}>
            <div className="card-title">{editId ? 'Modificare contract' : 'Contract nou'}</div>
            <p className="text-sm text-gray-400 mb-5">
              {editId
                ? <>Se modifică contractul <strong>{docFull(form.serie_prefix || serieContract?.prefix, AN, form.numar)}</strong> — numărul rămâne neschimbat</>
                : <>Va primi numărul <strong>{docFull(serieContract?.prefix, AN, urmatorulNr)}</strong></>}
            </p>

            <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mb-4">Date sponsor</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Denumire firmă <span className="text-red-500">*</span></label>
                <input className="form-input" value={form.sponsor_denumire} onChange={e => upd('sponsor_denumire', e.target.value)} placeholder="Ex: SC EXEMPLU SRL" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Sediul</label>
                <input className="form-input" value={form.sponsor_sediu} onChange={e => upd('sponsor_sediu', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Nr. Reg. Comerțului</label>
                <input className="form-input" value={form.sponsor_reg_com} onChange={e => upd('sponsor_reg_com', e.target.value)} placeholder="J22/123/2020" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">CUI</label>
                <div className="flex gap-2">
                  <input className="form-input" value={form.sponsor_cui}
                    onChange={e => upd('sponsor_cui', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), cautaCui())}
                    placeholder="Ex: 12345678" />
                  <button className="btn btn-outline gap-1.5 whitespace-nowrap" onClick={cautaCui} disabled={anaf.loading}>
                    <Search size={14} /> {anaf.loading ? '...' : 'Caută'}
                  </button>
                </div>
                {anaf.msg && <span className={`text-xs mt-1 block ${anaf.msg.startsWith('✓') ? 'text-green-600' : 'text-amber-600'}`}>{anaf.msg}</span>}
                <span className="text-xs text-gray-400 italic">Preia automat denumirea, sediul și nr. Reg. Com. de la ANAF</span>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Cont bancar</label>
                <input className="form-input" value={form.sponsor_cont} onChange={e => upd('sponsor_cont', e.target.value)} placeholder="RO..." />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Banca</label>
                <input className="form-input" value={form.sponsor_banca} onChange={e => upd('sponsor_banca', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Reprezentant legal</label>
                <input className="form-input" value={form.sponsor_reprezentant} onChange={e => upd('sponsor_reprezentant', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Calitate</label>
                <input className="form-input" value={form.sponsor_calitate} onChange={e => upd('sponsor_calitate', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">CI Seria</label>
                  <input className="form-input" maxLength={2} value={form.sponsor_ci_serie} onChange={e => upd('sponsor_ci_serie', e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">CI Nr.</label>
                  <input className="form-input" value={form.sponsor_ci_numar} onChange={e => upd('sponsor_ci_numar', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">CNP</label>
                <input className="form-input font-mono" maxLength={13} value={form.sponsor_cnp} onChange={e => upd('sponsor_cnp', e.target.value)} />
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mb-4 mt-6">Sponsorizare</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Suma (RON) <span className="text-red-500">*</span></label>
                <input className="form-input" type="number" step="0.01" value={form.suma} onChange={e => upd('suma', e.target.value)} />
                {form.suma ? <span className="text-xs text-gray-400 italic">{inLitere(form.suma)} lei</span> : null}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Data limită de plată</label>
                <input className="form-input" type="date" value={form.data_limita || ''} onChange={e => upd('data_limita', e.target.value)} />
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mb-4 mt-6">Semnatari asociație</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Semnatar 1 <span className="text-red-500">*</span></label>
                <select className="form-select" value={form.semnatar1_id} onChange={e => upd('semnatar1_id', e.target.value)}>
                  <option value="">— Selectează —</option>
                  {imputerniciti.map(i => <option key={i.id} value={i.id}>{i.nume} ({i.functie})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Semnatar 2 (opțional)</label>
                <select className="form-select" value={form.semnatar2_id} onChange={e => upd('semnatar2_id', e.target.value)}>
                  <option value="">— Fără al doilea semnatar —</option>
                  {imputerniciti.filter(i => i.id !== form.semnatar1_id).map(i => <option key={i.id} value={i.id}>{i.nume} ({i.functie})</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 mt-5 rounded-lg border-2 cursor-pointer"
              style={{ borderColor: form.are_chitanta ? '#c8a84b' : '#e5e7eb', background: form.are_chitanta ? '#fdf6e3' : '#fff' }}>
              <input type="checkbox" className="w-5 h-5" style={{ accentColor: '#c8a84b' }}
                checked={form.are_chitanta} onChange={e => upd('are_chitanta', e.target.checked)} />
              <div>
                <div className="font-medium text-sm">🧾 Emite și chitanță</div>
                <div className="text-xs text-gray-500">Se tipărește pe pagină separată, cu serie proprie</div>
              </div>
            </label>

            <div className="flex gap-3 mt-6">
              <button className="btn btn-outline flex-1 justify-center" onClick={anuleazaForm}>Anulează</button>
              <button className="btn btn-primary flex-1 justify-center" onClick={salveaza} disabled={saving}>
                {saving ? '⏳ Se salvează...' : editId ? '✓ Salvează modificările' : '✓ Generează contractul'}
              </button>
            </div>
          </div>
        )}

        {/* DOCUMENT */}
        {preview && (
          <div>
            <div className="no-print flex flex-wrap items-center gap-2 mb-4">
              <button className="btn btn-primary gap-2" onClick={() => window.print()}><Download size={14} /> Salvează PDF</button>
              <button className="btn btn-outline gap-2" onClick={() => window.print()}><Printer size={14} /> Tipărește</button>
              <button className="btn btn-outline gap-2" onClick={() => shareWhatsapp(preview)}><MessageCircle size={14} /> WhatsApp</button>
              <button className="btn btn-outline gap-2" onClick={() => shareEmail(preview)}><Mail size={14} /> E-mail</button>
              <button className="btn btn-outline gap-2" onClick={() => shareContract(preview)}><Share2 size={14} /> Distribuie</button>
              {isAdmin && (
                <>
                  <button className="btn btn-outline gap-2" onClick={() => deschideEditare(preview)}><Pencil size={14} /> Modifică</button>
                  <button className="btn btn-danger gap-2" onClick={() => stergeContract(preview)}><Trash2 size={14} /> Șterge</button>
                </>
              )}
              <button className="btn btn-outline" onClick={() => setPreview(null)}>✕ Închide</button>
            </div>

            <div id="print-area">
              {/* PAGINA 1 — CONTRACT */}
              <div className="doc-page">
                <div className="doc-nr">
                  Seria <strong>{serieCod(preview.serie_prefix, preview.serie_an)}</strong> &nbsp; Nr. <strong>{nrDoc(preview.numar)}</strong> &nbsp;·&nbsp; {dataRo(preview.data_contract)}
                </div>
                <div className="doc-title">CONTRACT DE SPONSORIZARE</div>

                <p><strong>{preview.sponsor_denumire}</strong>, cu sediul în {preview.sponsor_sediu || '__________'}, înregistrată la Registrul Comerțului sub nr. {preview.sponsor_reg_com || '__________'}, cod unic de înregistrare {preview.sponsor_cui || '__________'}, având contul nr. {preview.sponsor_cont || '__________'} deschis la {preview.sponsor_banca || '__________'}, reprezentată de către {preview.sponsor_reprezentant || '__________'}, legitimat cu CI seria {preview.sponsor_ci_serie || '__'} nr. {preview.sponsor_ci_numar || '______'}, CNP {preview.sponsor_cnp || '_____________'}, în calitate de {preview.sponsor_calitate || '__________'}, denumită în continuare <strong>Sponsor</strong>,</p>
                <p>și</p>
                <p><strong>ASOCIAȚIA SANSA 2010</strong>, cod fiscal 27772126, înregistrată în Registrul Asociațiilor și Fundațiilor de la Judecătoria Pașcani cu nr. 32/PJ/2010, cu sediul în Pașcani, str. Grădiniței nr. 22, bl. K4, ap. 15, cod poștal 705200, având contul nr. RO58RNCB0176160764990001 deschis la BCR Agenția Pașcani, reprezentată prin {preview.semnatar1_nume}, în calitate de {preview.semnatar1_functie}{preview.semnatar2_nume ? ` și prin ${preview.semnatar2_nume}, în calitate de ${preview.semnatar2_functie}` : ''}, denumită în continuare <strong>Beneficiar</strong>,</p>
                <p>au convenit încheierea prezentului contract de sponsorizare, în condițiile Legii nr. 32/1994 privind sponsorizarea, cu modificările și completările ulterioare.</p>

                <p className="doc-art">Art. 1. Obiectul contractului</p>
                <p>Obiectul prezentului contract îl constituie sponsorizarea activităților de voluntariat și a proiectelor desfășurate de Beneficiar.</p>

                <p className="doc-art">Art. 2. Obligațiile Sponsorului</p>
                <p>Sponsorul se obligă să predea Beneficiarului suma de <strong>{fmt(preview.suma)} RON</strong> ({inLitere(preview.suma)} lei), până la data de <strong>{preview.data_limita ? dataRo(preview.data_limita) : '__________'}</strong>, prin virament bancar în contul indicat mai sus sau în numerar.</p>

                <p className="doc-art">Art. 3. Obligațiile Beneficiarului</p>
                <p>Beneficiarul se obligă să utilizeze resursele financiare primite exclusiv în scopul enunțat la Art. 1 și să aducă la cunoștința publicului sponsorizarea, în condițiile Legii nr. 32/1994.</p>

                <p className="doc-art">Art. 4. Durata contractului</p>
                <p>Prezentul contract intră în vigoare la data semnării de către ambele părți și își produce efectele până la îndeplinirea integrală a obligațiilor asumate.</p>

                <p className="doc-art">Art. 5. Dispoziții finale</p>
                <p>Modificarea prezentului contract se face numai prin act adițional încheiat între părți. Litigiile decurgând din executarea prezentului contract se soluționează pe cale amiabilă, iar în caz contrar de către instanțele judecătorești competente.</p>

                <p style={{ marginTop: 16 }}>Încheiat astăzi, <strong>{dataRo(preview.data_contract)}</strong>, în două (2) exemplare originale, câte unul pentru fiecare parte.</p>

                <div className="doc-sign">
                  <div>
                    <strong>SPONSOR</strong><br />
                    {preview.sponsor_denumire}<br />
                    {preview.sponsor_reprezentant || ''}
                    <div className="line">semnătura și ștampila</div>
                  </div>
                  <div>
                    <strong>BENEFICIAR</strong><br />
                    ASOCIAȚIA SANSA 2010<br />
                    {preview.semnatar1_nume} — {preview.semnatar1_functie}
                    <div className="stamp-wrap">
                      <img src="/stampila.png" alt="" className="stamp-img" />
                    </div>
                    <div className="line">semnătura și ștampila</div>
                    {preview.semnatar2_nume && (
                      <div style={{ marginTop: 18 }}>
                        {preview.semnatar2_nume} — {preview.semnatar2_functie}
                        <div className="line">semnătura</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PAGINA 2 — CHITANȚĂ */}
              {preview.are_chitanta && (
                <div className="doc-page page-break">
                  <div style={{ textAlign: 'center', fontSize: '10.5pt', lineHeight: 1.4 }}>
                    <img src="/logo-sansa.png" alt="" className="doc-logo" />
                    <strong>ASOCIAȚIA SANSA 2010</strong><br />
                    CIF 27772126 · Reg. 32/PJ/2010 Judecătoria Pașcani<br />
                    Pașcani, str. Grădiniței nr. 22, bl. K4, ap. 15, jud. Iași<br />
                    Cont: RO58RNCB0176160764990001 — BCR Agenția Pașcani
                  </div>

                  <div className="doc-title" style={{ marginTop: 28 }}>CHITANȚĂ</div>
                  <div style={{ textAlign: 'center', marginTop: -12, marginBottom: 24, fontSize: '11pt' }}>
                    Seria <strong>{serieCod(preview.chitanta_prefix, preview.serie_an)}</strong> &nbsp; Nr. <strong>{nrDoc(preview.chitanta_numar)}</strong> &nbsp;·&nbsp; {dataRo(preview.chitanta_data)}
                  </div>

                  <p>Am primit de la <strong>{preview.sponsor_denumire}</strong>{preview.sponsor_cui ? `, CUI ${preview.sponsor_cui}` : ''}{preview.sponsor_sediu ? `, cu sediul în ${preview.sponsor_sediu}` : ''}.</p>
                  <p>Suma de <strong>{fmt(preview.suma)} RON</strong>, adică <strong>{inLitere(preview.suma)} lei</strong>.</p>
                  <p>Reprezentând: sponsorizare conform contractului {docFull(preview.serie_prefix, preview.serie_an, preview.numar)} din {dataRo(preview.data_contract)}.</p>

                  <div className="doc-sign" style={{ marginTop: 60, gridTemplateColumns: '1fr', justifyItems: 'end' }}>
                    <div style={{ minWidth: '48%' }}>
                      <strong>Casier</strong><br />{preview.semnatar1_nume}
                      <div className="stamp-wrap">
                        <img src="/stampila.png" alt="" className="stamp-img" />
                      </div>
                      <div className="line">semnătura și ștampila</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REGISTRU */}
        <div className="card no-print">
          <div className="flex items-center justify-between">
            <div className="card-title">Registru sponsorizări</div>
            {isAdmin && (
              <span className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: '#fef3c7', color: '#92400e' }}>
                <ShieldAlert size={12} /> mod administrator — modificare și ștergere active
              </span>
            )}
          </div>
          {sponsorizari.length === 0
            ? <EmptyState icon="📄" title="Niciun contract emis" subtitle="Apasă butonul Contract nou pentru a genera primul contract." />
            : (
              <div className="overflow-x-auto mt-3">
                <table className="tbl" style={{ minWidth: 760 }}>
                  <thead><tr><th>Serie / Nr.</th><th>Data</th><th>Sponsor</th><th>Suma</th><th>Semnatari</th><th>Chitanță</th><th></th></tr></thead>
                  <tbody>
                    {sponsorizari.map(s => (
                      <tr key={s.id}>
                        <td className="text-sm"><strong>{serieCod(s.serie_prefix, s.serie_an)}</strong> / {nrDoc(s.numar)}</td>
                        <td className="text-sm text-gray-500">{new Date(s.data_contract).toLocaleDateString('ro-RO')}</td>
                        <td className="font-medium text-sm">{s.sponsor_denumire}</td>
                        <td className="font-semibold">{fmt(s.suma)} RON</td>
                        <td className="text-xs text-gray-500">{s.semnatar1_nume}{s.semnatar2_nume ? ` + ${s.semnatar2_nume}` : ''}</td>
                        <td>{s.are_chitanta ? <Badge variant="gold">{serieCod(s.chitanta_prefix, s.serie_an)}/{nrDoc(s.chitanta_numar)}</Badge> : <Badge variant="gray">—</Badge>}</td>
                        <td>
                          <div className="flex gap-1.5">
                            <button className="btn btn-outline btn-sm" onClick={() => { setPreview(s); window.scrollTo(0, 0) }}>Deschide</button>
                            <button className="btn btn-outline btn-sm" onClick={() => shareWhatsapp(s)} title="WhatsApp"><MessageCircle size={13} /></button>
                            {isAdmin && (
                              <>
                                <button className="btn btn-outline btn-sm" onClick={() => deschideEditare(s)} title="Modifică"><Pencil size={13} /></button>
                                <button className="btn btn-danger btn-sm" onClick={() => stergeContract(s)} title="Șterge"><Trash2 size={13} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>
    </>
  )
}
