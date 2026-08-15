import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Modal, Spinner, EmptyState, Badge } from '../components/ui'
import { Plus, ClipboardCheck, Trash2, Pencil, ChevronLeft, ChevronRight, CalendarDays, List, Printer } from 'lucide-react'

const LUNI = ['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie']
const ZILE = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du']

const STATUS = {
  planificat:     { label: 'Planificat',      variant: 'blue',  culoare: '#3b82f6' },
  in_desfasurare: { label: 'În desfășurare',  variant: 'gold',  culoare: '#c8a84b' },
  incheiat:       { label: 'Încheiat',        variant: 'green', culoare: '#1a6b4a' },
  anulat:         { label: 'Anulat',          variant: 'red',   culoare: '#dc2626' },
}

const GOL = { nume: '', data: '', ora_start: '', ora_final: '', locatie: '', coordonator: '', descriere: '', status: 'planificat' }
const zi = d => d ? new Date(d).toLocaleDateString('ro-RO') : ''

export default function Activitati() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const poateSterge = !!user && user.rol !== 'guest'

  const [activitati, setActivitati] = useState([])
  const [pontaje, setPontaje] = useState([])
  const [loading, setLoading] = useState(true)
  const [vedere, setVedere] = useState('calendar')
  const [luna, setLuna] = useState(new Date())
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(GOL)
  const [editId, setEditId] = useState(null)
  const [salvez, setSalvez] = useState(false)
  const [ziSel, setZiSel] = useState(null)

  useEffect(() => { incarca() }, [])

  async function incarca() {
    const [a, p] = await Promise.all([
      supabase.from('activitati').select('*').order('data', { ascending: false }),
      supabase.from('pontaj').select('*'),
    ])
    setActivitati(a.data || []); setPontaje(p.data || [])
    setLoading(false)
  }

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const prezentiLa = id => pontaje.filter(p => p.activitate_id === id && p.status !== 'absent').length

  async function salveaza() {
    if (!form.nume || !form.data) return alert('Completați denumirea și data')
    setSalvez(true)
    const payload = { ...form }
    let err
    if (editId) ({ error: err } = await supabase.from('activitati').update(payload).eq('id', editId))
    else ({ error: err } = await supabase.from('activitati').insert(payload))
    setSalvez(false)
    if (err) return alert('Eroare: ' + err.message)
    setModal(false); setForm(GOL); setEditId(null); incarca()
  }

  async function sterge(a) {
    if (!confirm(`Ștergi activitatea „${a.nume}"?\nSe șterge și pontajul asociat.`)) return
    await supabase.from('activitati').delete().eq('id', a.id)
    incarca()
  }

  function editeaza(a) {
    setForm({
      nume: a.nume, data: a.data, ora_start: a.ora_start || '', ora_final: a.ora_final || '',
      locatie: a.locatie || '', coordonator: a.coordonator || '', descriere: a.descriere || '', status: a.status,
    })
    setEditId(a.id); setModal(true)
  }

  function deschideZi(dataStr) {
    setZiSel(dataStr)
    setForm({ ...GOL, data: dataStr })
  }

  // ── Grila calendar ─────────────────────────────────────────────
  const grila = useMemo(() => {
    const an = luna.getFullYear(), l = luna.getMonth()
    const prima = new Date(an, l, 1)
    let start = prima.getDay() - 1; if (start < 0) start = 6   // luni = 0
    const nrZile = new Date(an, l + 1, 0).getDate()
    const celule = []
    for (let i = 0; i < start; i++) celule.push(null)
    for (let d = 1; d <= nrZile; d++) {
      const ds = `${an}-${String(l + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      celule.push({ zi: d, data: ds, activitati: activitati.filter(a => a.data === ds) })
    }
    return celule
  }, [luna, activitati])

  const aziStr = new Date().toISOString().slice(0, 10)
  const activLuna = activitati.filter(a => a.data?.slice(0, 7) === `${luna.getFullYear()}-${String(luna.getMonth() + 1).padStart(2, '0')}`)
  const activZi = ziSel ? activitati.filter(a => a.data === ziSel) : []

  if (loading) return <><PageHeader title="Activități" /><Spinner /></>

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Activități"
          subtitle={`${activitati.length} activități înregistrate`}
          actions={
            <>
              <div className="vedere-comutator">
                <button className={vedere === 'calendar' ? 'active' : ''} onClick={() => setVedere('calendar')}>
                  <CalendarDays size={14} /> Calendar
                </button>
                <button className={vedere === 'lista' ? 'active' : ''} onClick={() => setVedere('lista')}>
                  <List size={14} /> Listă
                </button>
              </div>
              <button className="btn btn-primary btn-sm gap-1.5" onClick={() => { setForm(GOL); setEditId(null); setModal(true) }}>
                <Plus size={14} /> Activitate nouă
              </button>
            </>
          }
        />
      </div>

      <div className="p-4 sm:p-8 space-y-6">

        {vedere === 'calendar' ? (
          <>
            <div className="card">
              <div className="cal-cap">
                <button className="cal-nav" onClick={() => setLuna(new Date(luna.getFullYear(), luna.getMonth() - 1, 1))}>
                  <ChevronLeft size={18} />
                </button>
                <div className="cal-titlu">
                  {LUNI[luna.getMonth()]} {luna.getFullYear()}
                  <span className="cal-sub">{activLuna.length} {activLuna.length === 1 ? 'activitate' : 'activități'}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm" onClick={() => setLuna(new Date())}>Azi</button>
                  <button className="cal-nav" onClick={() => setLuna(new Date(luna.getFullYear(), luna.getMonth() + 1, 1))}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="cal-grila">
                {ZILE.map(z => <div key={z} className="cal-zi-cap">{z}</div>)}
                {grila.map((c, i) => c === null ? <div key={i} className="cal-celula goala" /> : (
                  <div key={i}
                    className={`cal-celula ${c.data === aziStr ? 'azi' : ''} ${c.activitati.length ? 'cu-activ' : ''} ${ziSel === c.data ? 'selectata' : ''}`}
                    onClick={() => deschideZi(c.data)}>
                    <div className="cal-numar">{c.zi}</div>
                    <div className="cal-evenimente">
                      {c.activitati.slice(0, 3).map(a => (
                        <div key={a.id} className="cal-eveniment"
                          style={{ borderLeftColor: STATUS[a.status]?.culoare || '#94a3b8' }}
                          title={`${a.nume}${a.ora_start ? ` · ${a.ora_start}` : ''}`}>
                          {a.ora_start && <span className="cal-ora">{a.ora_start}</span>}
                          {a.nume}
                        </div>
                      ))}
                      {c.activitati.length > 3 && (
                        <div className="cal-mai-mult">+{c.activitati.length - 3}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="cal-legenda">
                {Object.entries(STATUS).map(([k, v]) => (
                  <span key={k}><i style={{ background: v.culoare }} /> {v.label}</span>
                ))}
              </div>
            </div>

            {/* Detaliu zi selectata */}
            {ziSel && (
              <div className="card" style={{ borderColor: '#1a6b4a', borderWidth: 2 }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="card-title" style={{ marginBottom: 0 }}>{zi(ziSel)}</div>
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm gap-1.5" onClick={() => { setForm({ ...GOL, data: ziSel }); setEditId(null); setModal(true) }}>
                      <Plus size={13} /> Adaugă în această zi
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setZiSel(null)}>✕</button>
                  </div>
                </div>

                {activZi.length === 0
                  ? <p className="text-sm text-gray-400 mt-3">Nicio activitate programată în această zi.</p>
                  : (
                    <div className="space-y-3 mt-4">
                      {activZi.map(a => <RandActivitate key={a.id} a={a} {...{ prezentiLa, navigate, editeaza, sterge, poateSterge }} />)}
                    </div>
                  )
                }
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {activitati.length === 0
              ? <EmptyState icon="📅" title="Nicio activitate"
                  subtitle="Adaugă prima activitate pentru a putea marca prezența."
                  action={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Activitate nouă</button>} />
              : activitati.map(a => <RandActivitate key={a.id} a={a} card {...{ prezentiLa, navigate, editeaza, sterge, poateSterge }} />)
            }
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditId(null) }}
        title={editId ? 'Modificare activitate' : 'Activitate nouă'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setModal(false); setEditId(null) }}>Anulează</button>
            <button className="btn btn-primary" onClick={salveaza} disabled={salvez}>
              {salvez ? 'Se salvează...' : editId ? 'Salvează' : 'Adaugă activitatea'}
            </button>
          </>
        }>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Denumire <span className="text-red-500">*</span></label>
            <input className="form-input" value={form.nume} onChange={e => upd('nume', e.target.value)} placeholder="Ex: Atelier Creativitate" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Data <span className="text-red-500">*</span></label>
            <input className="form-input" type="date" value={form.data} onChange={e => upd('data', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Status</label>
            <select className="form-select" value={form.status} onChange={e => upd('status', e.target.value)}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Ora început</label>
            <input className="form-input" type="time" value={form.ora_start} onChange={e => upd('ora_start', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Ora sfârșit</label>
            <input className="form-input" type="time" value={form.ora_final} onChange={e => upd('ora_final', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Locație</label>
            <input className="form-input" value={form.locatie} onChange={e => upd('locatie', e.target.value)} placeholder="Ex: Centrul de tineret Pașcani" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Coordonator</label>
            <input className="form-input" value={form.coordonator} onChange={e => upd('coordonator', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Descriere</label>
            <textarea className="form-textarea" value={form.descriere} onChange={e => upd('descriere', e.target.value)} />
          </div>
        </div>
      </Modal>
    </>
  )
}

function RandActivitate({ a, card, prezentiLa, navigate, editeaza, sterge, poateSterge }) {
  const nrPrez = prezentiLa(a.id)
  return (
    <div className={card ? 'card flex items-center justify-between gap-4 flex-wrap' : 'act-rand'}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-base">{a.nume}</h3>
          <Badge variant={STATUS[a.status]?.variant || 'gray'}>{STATUS[a.status]?.label}</Badge>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-3 flex-wrap mt-1">
          <span>📅 {zi(a.data)}</span>
          {a.ora_start && <span>🕐 {a.ora_start}{a.ora_final ? `–${a.ora_final}` : ''}</span>}
          {a.locatie && <span>📍 {a.locatie}</span>}
          {a.coordonator && <span>👤 {a.coordonator}</span>}
          <span style={{ color: nrPrez ? '#1a6b4a' : undefined }}>✓ {nrPrez} {nrPrez === 1 ? 'prezent' : 'prezenți'}</span>
        </div>
        {a.descriere && <p className="text-sm text-gray-600 mt-1">{a.descriere}</p>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-outline btn-sm gap-1.5" onClick={() => navigate('/pontaj', { state: { actId: a.id } })}>
          <ClipboardCheck size={13} /> Pontaj
        </button>
        {poateSterge && (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => editeaza(a)}><Pencil size={13} /></button>
            <button className="btn btn-danger btn-sm" onClick={() => sterge(a)}><Trash2 size={13} /></button>
          </>
        )}
      </div>
    </div>
  )
}
