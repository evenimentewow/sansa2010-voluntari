import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { Plus, Trash2, Pencil, Download, Printer, FolderOpen, ArrowLeft, Landmark, Banknote, Save, HandCoins, Clock, Check, XCircle } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2 }).format(n || 0)
const zi = d => d ? new Date(d).toLocaleDateString('ro-RO') : ''
const azi = () => new Date().toISOString().slice(0, 10)

// Cota retinuta de asociatie pentru cheltuieli forfetare
const COTA_FORFETARA = 0.10

const SURSE = [
  { val: 'banca', eticheta: 'Bancă', icon: Landmark },
  { val: 'cash',  eticheta: 'Cash',  icon: Banknote },
]

const CHELT_GOL = { data_chelt: azi(), descriere: '', initiator: '', sursa_fonduri: 'cash', suma: '', document: '', observatii: '' }

export default function Proiecte() {
  const { user } = useAuth()
  const isGuest = user?.rol === 'guest'
  const esteAdmin = user?.rol === 'admin'
  const poateSterge = !!user && !isGuest

  const [proiecte, setProiecte] = useState([])
  const [cheltuieli, setCheltuieli] = useState([])
  const [sponsorizari, setSponsorizari] = useState([])
  const [cereri, setCereri] = useState([])
  const [alocare, setAlocare] = useState(null)   // proiectul pentru care se aloca contracte
  const [loading, setLoading] = useState(true)
  const [deschis, setDeschis] = useState(null)          // proiectul deschis
  const [formProiect, setFormProiect] = useState(null)  // {} sau proiect de editat
  const [chelt, setChelt] = useState(CHELT_GOL)
  const [editChelt, setEditChelt] = useState(null)
  const [salvez, setSalvez] = useState(false)

  useEffect(() => { incarca() }, [])

  async function incarca() {
    const [p, c, sp, cr] = await Promise.all([
      supabase.from('proiecte').select('*').order('created_at', { ascending: false }),
      supabase.from('cheltuieli').select('*').order('data_chelt', { ascending: true }),
      supabase.from('sponsorizari').select('*').order('numar', { ascending: false }),
      supabase.from('cereri_stergere').select('*').order('created_at', { ascending: false }),
    ])
    setProiecte(p.data || []); setCheltuieli(c.data || [])
    setSponsorizari(sp.data || []); setCereri(cr.data || [])
    setLoading(false)
  }

  // ── Buget din contracte de sponsorizare alocate ────────────────
  // Sponsorizat = suma bruta a contractelor
  // Forfetar    = 10% retinut de asociatie
  // Buget       = ce ramane disponibil pentru proiect
  const sponsorizatProiect = (pid) => sponsorizari
    .filter(s => s.proiect_id === pid)
    .reduce((t, s) => t + Number(s.suma || 0), 0)

  const forfetarProiect = (pid) => sponsorizatProiect(pid) * COTA_FORFETARA
  const bugetProiect    = (pid) => sponsorizatProiect(pid) * (1 - COTA_FORFETARA)

  async function comutaAlocare(contract, pid) {
    const nou = contract.proiect_id === pid ? null : pid
    const { error } = await supabase.from('sponsorizari').update({ proiect_id: nou }).eq('id', contract.id)
    if (error) return alert('Eroare: ' + error.message)
    setSponsorizari(list => list.map(x => x.id === contract.id ? { ...x, proiect_id: nou } : x))
  }

  // ── Cereri de stergere ─────────────────────────────────────────
  async function cereStergere(c) {
    const motiv = prompt(`Cerere de ștergere pentru:\n„${c.descriere}" — ${fmt(c.suma)} RON\n\nMotivul ștergerii:`)
    if (motiv === null) return
    if (!motiv.trim()) return alert('Motivul este obligatoriu.')
    const { error } = await supabase.from('cereri_stergere').insert({
      cheltuiala_id: c.id, proiect_id: c.proiect_id,
      descriere: c.descriere, suma: c.suma, data_chelt: c.data_chelt,
      motiv: motiv.trim(), solicitat_de: user?.email || 'guest', status: 'in_asteptare',
    })
    if (error) return alert('Eroare: ' + error.message)
    alert('Cererea a fost trimisă administratorului spre aprobare.')
    incarca()
  }

  async function aprobaCerere(cer) {
    if (!confirm(`Aprobi ștergerea?\n\n„${cer.descriere}" — ${fmt(cer.suma)} RON\nMotiv: ${cer.motiv}`)) return
    await supabase.from('cheltuieli').delete().eq('id', cer.cheltuiala_id)
    await supabase.from('cereri_stergere').update({
      status: 'aprobata', decis_de: user?.email, decis_la: new Date().toISOString(),
    }).eq('id', cer.id)
    incarca()
  }

  async function respingeCerere(cer) {
    const motiv = prompt('Motivul respingerii (opțional):')
    if (motiv === null) return
    await supabase.from('cereri_stergere').update({
      status: 'respinsa', decis_de: user?.email, decis_la: new Date().toISOString(),
      motiv_decizie: motiv || null,
    }).eq('id', cer.id)
    incarca()
  }

  // ── Proiecte ───────────────────────────────────────────────────
  async function salveazaProiect() {
    if (!formProiect.denumire?.trim()) return alert('Completați denumirea proiectului')
    setSalvez(true)
    const payload = {
      denumire: formProiect.denumire.trim(),
      descriere: formProiect.descriere || null,
      an: parseInt(formProiect.an) || new Date().getFullYear(),
      status: formProiect.status || 'activ',
    }
    let err
    if (formProiect.id) {
      ({ error: err } = await supabase.from('proiecte').update(payload).eq('id', formProiect.id))
    } else {
      ({ error: err } = await supabase.from('proiecte').insert({ ...payload, creat_de: user?.email || 'guest' }))
    }
    setSalvez(false)
    if (err) return alert('Eroare: ' + err.message)
    setFormProiect(null); incarca()
  }

  async function stergeProiect(p) {
    const n = cheltuieli.filter(c => c.proiect_id === p.id).length
    if (!confirm(`Ștergi proiectul „${p.denumire}"?\n\nSe vor șterge și cele ${n} cheltuieli înregistrate. Operațiunea nu poate fi anulată.`)) return
    const { error } = await supabase.from('proiecte').delete().eq('id', p.id)
    if (error) return alert('Eroare: ' + error.message)
    if (deschis?.id === p.id) setDeschis(null)
    incarca()
  }

  // ── Cheltuieli ─────────────────────────────────────────────────
  async function salveazaCheltuiala() {
    if (!chelt.descriere?.trim()) return alert('Completați descrierea cheltuielii')
    if (!chelt.suma) return alert('Completați suma')
    setSalvez(true)
    const payload = {
      proiect_id: deschis.id,
      data_chelt: chelt.data_chelt || azi(),
      descriere: chelt.descriere.trim(),
      initiator: chelt.initiator || null,
      sursa_fonduri: chelt.sursa_fonduri,
      suma: parseFloat(chelt.suma),
      document: chelt.document || null,
      observatii: chelt.observatii || null,
    }
    let err
    if (editChelt) {
      ({ error: err } = await supabase.from('cheltuieli').update(payload).eq('id', editChelt))
    } else {
      ({ error: err } = await supabase.from('cheltuieli').insert({ ...payload, inregistrat_de: user?.email || 'guest' }))
    }
    setSalvez(false)
    if (err) return alert('Eroare: ' + err.message)
    setChelt({ ...CHELT_GOL, data_chelt: chelt.data_chelt })  // pastreaza data pentru introduceri succesive
    setEditChelt(null)
    incarca()
  }

  function editeazaCheltuiala(c) {
    setChelt({
      data_chelt: c.data_chelt, descriere: c.descriere, initiator: c.initiator || '',
      sursa_fonduri: c.sursa_fonduri, suma: c.suma, document: c.document || '', observatii: c.observatii || '',
    })
    setEditChelt(c.id)
    window.scrollTo(0, 0)
  }

  async function stergeCheltuiala(c) {
    if (!confirm(`Ștergi cheltuiala „${c.descriere}" (${fmt(c.suma)} RON)?`)) return
    const { error } = await supabase.from('cheltuieli').delete().eq('id', c.id)
    if (error) return alert('Eroare: ' + error.message)
    incarca()
  }

  // ── Calcule ────────────────────────────────────────────────────
  const cheltProiect = useMemo(
    () => deschis ? cheltuieli.filter(c => c.proiect_id === deschis.id) : [],
    [cheltuieli, deschis]
  )
  const total     = cheltProiect.reduce((s, c) => s + Number(c.suma || 0), 0)
  const totalBanca = cheltProiect.filter(c => c.sursa_fonduri === 'banca').reduce((s, c) => s + Number(c.suma || 0), 0)
  const totalCash  = cheltProiect.filter(c => c.sursa_fonduri === 'cash').reduce((s, c) => s + Number(c.suma || 0), 0)
  const brutDeschis     = deschis ? sponsorizatProiect(deschis.id) : 0
  const forfetarDeschis = deschis ? forfetarProiect(deschis.id) : 0
  const bugetDeschis    = deschis ? bugetProiect(deschis.id) : 0
  const ramas = deschis ? bugetDeschis - total : null
  const contracteDeschis = deschis ? sponsorizari.filter(s => s.proiect_id === deschis.id) : []
  const cereriProiect = deschis ? cereri.filter(c => c.proiect_id === deschis.id && c.status === 'in_asteptare') : []
  const cerereActiva = (chid) => cereriProiect.find(c => c.cheltuiala_id === chid)

  function exportJurnal() {
    const randuri = [
      [`JURNAL DE CHELTUIELI — ${deschis.denumire}`],
      [`Asociația ȘANSA 2010 · CIF 27772126 · Generat: ${new Date().toLocaleString('ro-RO')}`],
      [],
      ['Nr. crt.', 'Data cheltuielii', 'Descriere cheltuială', 'Inițiator', 'Sursă fonduri', 'Suma RON', 'Document', 'Observații'],
      ...cheltProiect.map((c, i) => [
        i + 1, zi(c.data_chelt), c.descriere, c.initiator,
        c.sursa_fonduri === 'banca' ? 'Bancă' : 'Cash',
        Number(c.suma || 0).toFixed(2), c.document, c.observatii,
      ]),
      [],
      ['', '', 'TOTAL GENERAL', '', '', total.toFixed(2)],
      ['', '', 'din care Bancă', '', '', totalBanca.toFixed(2)],
      ['', '', 'din care Cash', '', '', totalCash.toFixed(2)],
      [],
      ['', '', 'Total sponsorizat', '', '', brutDeschis.toFixed(2)],
      ['', '', 'Cheltuieli forfetare asociatie (10%)', '', '', (-forfetarDeschis).toFixed(2)],
      ['', '', 'Buget disponibil proiect', '', '', bugetDeschis.toFixed(2)],
      ['', '', 'Cheltuit', '', '', (-total).toFixed(2)],
      ['', '', 'Disponibil ramas', '', '', (ramas || 0).toFixed(2)],
      [],
      ['Contracte de sponsorizare alocate:'],
      ['Serie/Nr.', 'Data', 'Sponsor', '', '', 'Suma RON'],
      ...contracteDeschis.map(c => [
        `${(c.serie_prefix || '').toUpperCase()}${c.serie_an}/${String(c.numar).padStart(3, '0')}`,
        zi(c.data_contract), c.sponsor_denumire, '', '', Number(c.suma || 0).toFixed(2),
      ]),
    ]
    const csv = randuri.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jurnal_${deschis.denumire.replace(/[^a-zA-Z0-9]/g, '_')}_${azi()}.csv`
    a.click()
  }

  if (loading) return <><PageHeader title="Proiecte" /><Spinner /></>

  // ═══════════ LISTA PROIECTE ═══════════
  if (!deschis) return (
    <>
      <div className="no-print">
        <PageHeader
          title="Proiecte și cheltuieli"
          subtitle={`${proiecte.length} ${proiecte.length === 1 ? 'proiect' : 'proiecte'}`}
          actions={
            <button className="btn btn-primary btn-sm gap-1.5"
              onClick={() => setFormProiect({ denumire: '', descriere: '', an: new Date().getFullYear(), buget: '', status: 'activ' })}>
              <Plus size={14} /> Proiect nou
            </button>
          }
        />
      </div>

      <div className="p-4 sm:p-8 space-y-6">
        {formProiect && (
          <div className="card" style={{ borderColor: '#1a6b4a', borderWidth: 2 }}>
            <div className="card-title">{formProiect.id ? 'Modificare proiect' : 'Proiect nou'}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Denumire proiect <span className="text-red-500">*</span></label>
                <input className="form-input" value={formProiect.denumire}
                  onChange={e => setFormProiect(p => ({ ...p, denumire: e.target.value }))}
                  placeholder="Ex: Tabăra Împreună pentru Tineri 2026" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Descriere</label>
                <textarea className="form-textarea" value={formProiect.descriere || ''}
                  onChange={e => setFormProiect(p => ({ ...p, descriere: e.target.value }))}
                  placeholder="Scurtă descriere a proiectului..." />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Anul</label>
                <input className="form-input" type="number" value={formProiect.an}
                  onChange={e => setFormProiect(p => ({ ...p, an: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Status</label>
                <select className="form-select" value={formProiect.status}
                  onChange={e => setFormProiect(p => ({ ...p, status: e.target.value }))}>
                  <option value="activ">Activ</option>
                  <option value="incheiat">Încheiat</option>
                  <option value="suspendat">Suspendat</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn btn-outline flex-1 justify-center" onClick={() => setFormProiect(null)}>Anulează</button>
              <button className="btn btn-primary flex-1 justify-center" onClick={salveazaProiect} disabled={salvez}>
                {salvez ? 'Se salvează...' : formProiect.id ? 'Salvează modificările' : 'Creează proiectul'}
              </button>
            </div>
          </div>
        )}

        {alocare && (
          <div className="card" style={{ borderColor: '#c8a84b', borderWidth: 2 }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="card-title" style={{ marginBottom: 2 }}>Finanțarea proiectului „{alocare.denumire}"</div>
                <p className="text-sm text-gray-400">Bifează contractele de sponsorizare care finanțează acest proiect</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setAlocare(null)}>✕ Închide</button>
            </div>

            <div className="aloc-calcul">
              <div className="aloc-linie">
                <span>Total contracte alocate</span>
                <strong>{fmt(sponsorizatProiect(alocare.id))} RON</strong>
              </div>
              <div className="aloc-linie minus">
                <span>Cheltuieli forfetare asociație (10%)</span>
                <strong>− {fmt(forfetarProiect(alocare.id))} RON</strong>
              </div>
              <div className="aloc-linie final">
                <span>Buget disponibil pentru proiect</span>
                <strong>{fmt(bugetProiect(alocare.id))} RON</strong>
              </div>
            </div>

            {sponsorizari.length === 0 ? (
              <p className="text-sm text-gray-400 mt-4">Niciun contract de sponsorizare înregistrat încă.</p>
            ) : (
              <div className="aloc-lista">
                {sponsorizari.map(sp => {
                  const alAcestuia = sp.proiect_id === alocare.id
                  const altProiect = sp.proiect_id && !alAcestuia
                    ? proiecte.find(x => x.id === sp.proiect_id) : null
                  return (
                    <label key={sp.id} className={`aloc-rand ${alAcestuia ? 'active' : ''} ${altProiect ? 'ocupat' : ''}`}>
                      <input type="checkbox" checked={alAcestuia}
                        onChange={() => comutaAlocare(sp, alocare.id)}
                        style={{ accentColor: '#c8a84b', width: 17, height: 17 }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{sp.sponsor_denumire}</div>
                        <div className="text-xs text-gray-400">
                          {(sp.serie_prefix || '').toUpperCase()}{sp.serie_an} nr. {String(sp.numar).padStart(3, '0')} · {zi(sp.data_contract)}
                          {altProiect ? ` · alocat la „${altProiect.denumire}"` : ''}
                        </div>
                      </div>
                      <strong className="text-sm whitespace-nowrap">{fmt(sp.suma)} RON</strong>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {proiecte.length === 0 && !formProiect ? (
          <EmptyState icon="📁" title="Niciun proiect creat"
            subtitle="Creează primul proiect pentru a începe evidența cheltuielilor."
            action={<button className="btn btn-primary" onClick={() => setFormProiect({ denumire: '', descriere: '', an: new Date().getFullYear(), buget: '', status: 'activ' })}>+ Proiect nou</button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {proiecte.map(p => {
              const ch = cheltuieli.filter(c => c.proiect_id === p.id)
              const t = ch.reduce((s, c) => s + Number(c.suma || 0), 0)
              const brut = sponsorizatProiect(p.id)
              const bug = bugetProiect(p.id)
              const nrContracte = sponsorizari.filter(s => s.proiect_id === p.id).length
              const proc = bug ? Math.min(100, (t / bug) * 100) : null
              return (
                <div key={p.id} className="card proiect-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-base">{p.denumire}</h3>
                        <Badge variant={p.status === 'activ' ? 'green' : p.status === 'incheiat' ? 'gray' : 'gold'}>{p.status}</Badge>
                      </div>
                      {p.descriere && <p className="text-sm text-gray-500 mt-1">{p.descriere}</p>}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-4 mt-4 flex-wrap">
                    <div>
                      <div className="font-serif text-2xl" style={{ color: '#1a6b4a' }}>{fmt(t)}</div>
                      <div className="text-xs text-gray-400">RON cheltuiți · {ch.length} {ch.length === 1 ? 'poziție' : 'poziții'}</div>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-600">din {fmt(bug)}</div>
                      <div className="text-xs text-gray-400">
                        {nrContracte
                          ? `buget net · ${fmt(brut)} sponsorizat`
                          : 'niciun contract alocat'}
                      </div>
                    </div>
                  </div>

                  {proc !== null && (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
                      <div className="h-full rounded-full" style={{ width: `${proc}%`, background: proc > 90 ? '#dc2626' : '#1a6b4a' }} />
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button className="btn btn-primary btn-sm gap-1.5" onClick={() => { setDeschis(p); setChelt(CHELT_GOL); setEditChelt(null) }}>
                      <FolderOpen size={13} /> Deschide jurnalul
                    </button>
                    <button className="btn btn-outline btn-sm gap-1.5" onClick={() => setAlocare(p)}>
                      <HandCoins size={13} /> Finanțare
                    </button>
                    {poateSterge && (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => setFormProiect(p)} title="Modifică"><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => stergeProiect(p)} title="Șterge"><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )

  // ═══════════ JURNAL PROIECT ═══════════
  return (
    <>
      <div className="no-print">
        <PageHeader
          title={deschis.denumire}
          subtitle={`Jurnal de cheltuieli · ${cheltProiect.length} ${cheltProiect.length === 1 ? 'poziție' : 'poziții'}`}
          actions={
            <button className="btn btn-outline btn-sm gap-1.5" onClick={() => setDeschis(null)}>
              <ArrowLeft size={14} /> Toate proiectele
            </button>
          }
        />
      </div>

      <div className="p-4 sm:p-8 space-y-6">

        {/* Sinteza */}
        <div className="grid grid-cols-4 gap-4 no-print">
          <div className="stat-mini"><div className="stat-mini-num">{fmt(total)}</div><div className="stat-mini-lbl">Total cheltuit (RON)</div></div>
          <div className="stat-mini"><div className="stat-mini-num">{fmt(totalBanca)}</div><div className="stat-mini-lbl">Prin bancă</div></div>
          <div className="stat-mini"><div className="stat-mini-num">{fmt(totalCash)}</div><div className="stat-mini-lbl">În numerar</div></div>
          <div className="stat-mini">
            <div className="stat-mini-num" style={{ color: ramas < 0 ? '#dc2626' : undefined }}>{fmt(ramas)}</div>
            <div className="stat-mini-lbl">Disponibil din {fmt(bugetDeschis)}</div>
          </div>
        </div>

        {/* Cereri de stergere in asteptare */}
        {cereriProiect.length > 0 && (
          <div className="card no-print" style={{ borderColor: '#f59e0b', borderWidth: 2 }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} style={{ color: '#b45309' }} />
              <span className="card-title" style={{ marginBottom: 0 }}>
                {esteAdmin ? 'Cereri de ștergere în așteptare' : 'Cereri trimise spre aprobare'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {esteAdmin
                ? 'Ștergerea cheltuielilor necesită aprobarea dumneavoastră.'
                : 'Administratorul trebuie să aprobe aceste ștergeri.'}
            </p>
            <div className="space-y-2">
              {cereriProiect.map(cer => (
                <div key={cer.id} className="cerere-rand">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{cer.descriere} — {fmt(cer.suma)} RON</div>
                    <div className="text-xs text-gray-500">
                      {zi(cer.data_chelt)} · solicitat de {cer.solicitat_de}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#b45309' }}>Motiv: {cer.motiv}</div>
                  </div>
                  {esteAdmin ? (
                    <div className="flex gap-2">
                      <button className="btn btn-danger btn-sm gap-1.5" onClick={() => aprobaCerere(cer)}>
                        <Check size={13} /> Aprobă ștergerea
                      </button>
                      <button className="btn btn-outline btn-sm gap-1.5" onClick={() => respingeCerere(cer)}>
                        <XCircle size={13} /> Respinge
                      </button>
                    </div>
                  ) : (
                    <Badge variant="gold">în așteptare</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contracte care finanteaza proiectul */}
        {contracteDeschis.length > 0 && (
          <div className="card no-print">
            <div className="card-title">Finanțare proiect</div>
            <p className="text-sm text-gray-400 mb-3">
              {contracteDeschis.length} {contracteDeschis.length === 1 ? 'contract de sponsorizare' : 'contracte de sponsorizare'}
            </p>
            <div className="space-y-1.5">
              {contracteDeschis.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <span className="font-medium">{c.sponsor_denumire}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {(c.serie_prefix || '').toUpperCase()}{c.serie_an}/{String(c.numar).padStart(3, '0')}
                    </span>
                  </div>
                  <strong className="whitespace-nowrap" style={{ color: '#c8a84b' }}>{fmt(c.suma)} RON</strong>
                </div>
              ))}
            </div>

            <div className="aloc-calcul" style={{ marginTop: 14 }}>
              <div className="aloc-linie">
                <span>Total sponsorizat</span>
                <strong>{fmt(brutDeschis)} RON</strong>
              </div>
              <div className="aloc-linie minus">
                <span>Cheltuieli forfetare asociație (10%)</span>
                <strong>− {fmt(forfetarDeschis)} RON</strong>
              </div>
              <div className="aloc-linie final">
                <span>Buget disponibil pentru proiect</span>
                <strong>{fmt(bugetDeschis)} RON</strong>
              </div>
            </div>
          </div>
        )}

        {/* Formular cheltuiala */}
        <div className="card no-print" style={editChelt ? { borderColor: '#c8a84b', borderWidth: 2 } : undefined}>
          <div className="card-title">{editChelt ? 'Modificare cheltuială' : 'Cheltuială nouă'}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Data cheltuielii <span className="text-red-500">*</span></label>
              <input className="form-input" type="date" value={chelt.data_chelt}
                onChange={e => setChelt(p => ({ ...p, data_chelt: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Descriere cheltuială <span className="text-red-500">*</span></label>
              <input className="form-input" value={chelt.descriere}
                onChange={e => setChelt(p => ({ ...p, descriere: e.target.value }))}
                placeholder="Ex: Materiale atelier, transport participanți..." />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Inițiator</label>
              <input className="form-input" value={chelt.initiator}
                onChange={e => setChelt(p => ({ ...p, initiator: e.target.value }))}
                placeholder="Cine a solicitat" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Sursă fonduri <span className="text-red-500">*</span></label>
              <div className="sursa-grup">
                {SURSE.map(({ val, eticheta, icon: Icon }) => (
                  <button key={val} type="button"
                    className={`sursa-btn ${chelt.sursa_fonduri === val ? 'active' : ''}`}
                    onClick={() => setChelt(p => ({ ...p, sursa_fonduri: val }))}>
                    <Icon size={15} /> {eticheta}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Suma (RON) <span className="text-red-500">*</span></label>
              <input className="form-input" type="number" step="0.01" value={chelt.suma}
                onChange={e => setChelt(p => ({ ...p, suma: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Document justificativ</label>
              <input className="form-input" value={chelt.document}
                onChange={e => setChelt(p => ({ ...p, document: e.target.value }))}
                placeholder="Ex: Factura 1234 / Bon 56" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Observații</label>
              <input className="form-input" value={chelt.observatii}
                onChange={e => setChelt(p => ({ ...p, observatii: e.target.value }))} placeholder="opțional" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            {editChelt && <button className="btn btn-outline" onClick={() => { setChelt(CHELT_GOL); setEditChelt(null) }}>Anulează</button>}
            <button className="btn btn-primary gap-2" onClick={salveazaCheltuiala} disabled={salvez}>
              <Save size={14} /> {salvez ? 'Se salvează...' : editChelt ? 'Salvează modificările' : 'Adaugă în jurnal'}
            </button>
          </div>
        </div>

        {/* Jurnalul */}
        <div className="card">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
            <div className="card-title" style={{ marginBottom: 0 }}>Jurnal de cheltuieli</div>
            <div className="flex gap-2 no-print">
              <button className="btn btn-outline btn-sm gap-1.5" onClick={exportJurnal} disabled={!cheltProiect.length}>
                <Download size={13} /> Export Excel
              </button>
              <button className="btn btn-outline btn-sm gap-1.5" onClick={() => window.print()} disabled={!cheltProiect.length}>
                <Printer size={13} /> Tipărește
              </button>
            </div>
          </div>

          <div id="print-area">
            <div className="jurnal-antet">
              <strong>ASOCIAȚIA ȘANSA 2010</strong> · CIF 27772126<br />
              JURNAL DE CHELTUIELI — {deschis.denumire}
              {deschis.an ? ` · anul ${deschis.an}` : ''}
            </div>

            {cheltProiect.length === 0 ? (
              <p className="text-sm text-gray-400 mt-4">Nicio cheltuială înregistrată încă. Completează formularul de mai sus.</p>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="tbl jurnal-tbl" style={{ minWidth: 780 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 62 }}>Nr. crt.</th>
                      <th style={{ width: 110 }}>Data cheltuielii</th>
                      <th>Descriere cheltuială</th>
                      <th style={{ width: 130 }}>Inițiator</th>
                      <th style={{ width: 110 }}>Sursă fonduri</th>
                      <th style={{ width: 110 }}>Suma (RON)</th>
                      <th className="no-print" style={{ width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cheltProiect.map((c, i) => (
                      <tr key={c.id}>
                        <td className="text-center">{i + 1}</td>
                        <td className="text-sm">{zi(c.data_chelt)}</td>
                        <td className="text-sm">
                          {c.descriere}
                          {(c.document || c.observatii) && (
                            <div className="text-xs text-gray-400">
                              {c.document}{c.document && c.observatii ? ' · ' : ''}{c.observatii}
                            </div>
                          )}
                        </td>
                        <td className="text-sm text-gray-600">{c.initiator || '—'}</td>
                        <td>
                          <Badge variant={c.sursa_fonduri === 'banca' ? 'blue' : 'gold'}>
                            {c.sursa_fonduri === 'banca' ? 'Bancă' : 'Cash'}
                          </Badge>
                        </td>
                        <td className="font-semibold">{fmt(c.suma)}</td>
                        <td className="no-print">
                          <div className="flex gap-1.5">
                            <button className="btn btn-outline btn-sm" onClick={() => editeazaCheltuiala(c)} title="Modifică"><Pencil size={12} /></button>
                            {cerereActiva(c.id)
                              ? <Badge variant="gold">cerere trimisă</Badge>
                              : esteAdmin
                                ? <button className="btn btn-danger btn-sm" onClick={() => stergeCheltuiala(c)} title="Șterge"><Trash2 size={12} /></button>
                                : <button className="btn btn-outline btn-sm" onClick={() => cereStergere(c)} title="Cere ștergerea"><Trash2 size={12} /></button>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="jurnal-total">
                      <td colSpan={5} style={{ textAlign: 'right' }}><strong>TOTAL GENERAL</strong></td>
                      <td><strong>{fmt(total)}</strong></td>
                      <td className="no-print"></td>
                    </tr>
                    <tr className="jurnal-sub">
                      <td colSpan={5} style={{ textAlign: 'right' }}>din care prin bancă</td>
                      <td>{fmt(totalBanca)}</td>
                      <td className="no-print"></td>
                    </tr>
                    <tr className="jurnal-sub">
                      <td colSpan={5} style={{ textAlign: 'right' }}>din care în numerar</td>
                      <td>{fmt(totalCash)}</td>
                      <td className="no-print"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="jurnal-semnaturi">
              <div>Întocmit,<div className="line">nume și semnătura</div></div>
              <div>Verificat,<div className="line">nume și semnătura</div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
