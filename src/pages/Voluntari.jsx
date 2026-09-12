import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Badge, Avatar, Modal, SectionTitle, Spinner, EmptyState } from '../components/ui'
import { Search, UserPlus, FileText, Pencil, Trash2, Save, Clock } from 'lucide-react'

const STATUS_VARIANT = { activ: 'green', inactiv: 'gray', suspendat: 'red' }
const ROLURI = [
  'coordonator echipă', 'organizare și susținere atelier', 'media/foto-video',
  'activități sportive și aventură', 'treasure-hunt', 'departament administrativ',
]

function calcMinor(cnp) {
  if (!cnp || cnp.length < 7) return false
  const sex = parseInt(cnp[0]); const an = parseInt(cnp.slice(1, 3))
  const secol = sex <= 2 ? 1900 : sex <= 4 ? 1800 : 2000
  return (new Date().getFullYear() - (secol + an)) < 18
}

export default function Voluntari() {
  const { user } = useAuth()
  const poateEdita = !!user && user.rol !== 'guest'
  const esteAdmin = user?.rol === 'admin'

  const [voluntari, setVoluntari] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('toti')
  const [selected, setSelected] = useState(null)
  const [edit, setEdit] = useState(null)
  const [salvez, setSalvez] = useState(false)

  useEffect(() => { fetchVoluntari() }, [])

  useEffect(() => {
    let list = voluntari
    if (filterStatus !== 'toti') list = list.filter(v => v.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.nume?.toLowerCase().includes(q) || v.localitate?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) || v.cnp?.includes(q) || v.institutie?.toLowerCase().includes(q))
    }
    setFiltered(list)
  }, [voluntari, search, filterStatus])

  async function fetchVoluntari() {
    const { data } = await supabase.from('voluntari').select('*').order('created_at', { ascending: false })
    setVoluntari(data || []); setFiltered(data || []); setLoading(false)
  }

  function deschideEditare(v) {
    setEdit({ ...v, rol_dorit: v.rol_dorit || [] })
    setSelected(null)
  }
  const upd = (f, val) => setEdit(p => ({ ...p, [f]: val }))
  function toggleRol(r) {
    const c = edit.rol_dorit || []
    upd('rol_dorit', c.includes(r) ? c.filter(x => x !== r) : [...c, r])
  }

  async function salveaza() {
    if (!edit.nume || !edit.cnp) return alert('Numele și CNP-ul sunt obligatorii')
    setSalvez(true)
    const { id, created_at, ...rest } = edit
    const payload = {
      ...rest,
      minor: calcMinor(edit.cnp || ''),
      ore_totale: Number(edit.ore_totale) || 0,
      data_nasterii: edit.data_nasterii || null,
      ci_data_elib: edit.ci_data_elib || null,
      data_inrolare: edit.data_inrolare || null,
    }
    const { error } = await supabase.from('voluntari').update(payload).eq('id', id)
    setSalvez(false)
    if (error) return alert('Eroare: ' + error.message)
    setEdit(null); fetchVoluntari()
  }

  async function sterge(v) {
    if (!confirm(`ȘTERGERE DEFINITIVĂ\n\n${v.nume} (CNP ${v.cnp})\n\nSe șterg și contractele și pontajele asociate. Continui?`)) return
    const { error } = await supabase.from('voluntari').delete().eq('id', v.id)
    if (error) return alert('Eroare: ' + error.message)
    setSelected(null); fetchVoluntari()
  }

  const counts = {
    toti: voluntari.length,
    activ: voluntari.filter(v => v.status === 'activ').length,
    inactiv: voluntari.filter(v => v.status !== 'activ').length,
  }

  const C = ({ eticheta, camp, tip = 'text', latime }) => (
    <div className={latime || ''}>
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">{eticheta}</label>
      <input className="form-input" type={tip} value={edit[camp] ?? ''} onChange={e => upd(camp, e.target.value)} />
    </div>
  )

  return (
    <>
      <PageHeader
        title="Voluntari"
        subtitle={`${counts.activ} activi din ${counts.toti} înregistrați`}
        actions={<Link to="/app/inrolare" className="btn btn-primary btn-sm gap-1.5"><UserPlus size={14} /> Înrolează voluntar</Link>}
      />

      <div className="p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2" style={{ width: 300 }}>
            <Search size={15} className="text-gray-400" />
            <input className="flex-1 text-sm outline-none" placeholder="Caută după nume, CNP, localitate..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {['toti', 'activ', 'inactiv'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium ${filterStatus === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                style={{ border: 'none', cursor: 'pointer' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon="🔍" title="Niciun voluntar găsit"
            subtitle="Încearcă alt termen de căutare sau înrolează un voluntar nou."
            action={<Link to="/app/inrolare" className="btn btn-primary">+ Înrolează voluntar</Link>} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="tbl" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Voluntar</th><th>CNP</th><th>Localitate</th><th>Instituție</th>
                  <th>Ore</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={v.nume} />
                        <div>
                          <div className="font-medium text-sm">{v.nume}{v.minor && <span className="text-xs text-amber-600 ml-1">minor</span>}</div>
                          <div className="text-xs text-gray-400">{v.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-gray-500 font-mono">{v.cnp}</td>
                    <td className="text-sm">{v.localitate}</td>
                    <td className="text-xs text-gray-600">{v.institutie}</td>
                    <td><span className="font-semibold">{v.ore_totale}</span><span className="text-xs text-gray-400"> ore</span></td>
                    <td><Badge variant={STATUS_VARIANT[v.status] || 'gray'}>{v.status}</Badge></td>
                    <td>
                      <div className="flex gap-1.5">
                        <button className="btn btn-outline btn-sm" onClick={() => setSelected(v)}>Detalii</button>
                        {poateEdita && <button className="btn btn-outline btn-sm" onClick={() => deschideEditare(v)} title="Modifică"><Pencil size={13} /></button>}
                        {esteAdmin && <button className="btn btn-danger btn-sm" onClick={() => sterge(v)} title="Șterge"><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detalii ── */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={selected?.nume}
        subtitle={`${selected?.institutie || ''} · înrolat ${selected?.data_inrolare || ''}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setSelected(null)}>Închide</button>
            {poateEdita && <button className="btn btn-primary gap-1.5" onClick={() => deschideEditare(selected)}><Pencil size={14} /> Modifică</button>}
          </>
        }>
        {selected && (
          <>
            <SectionTitle>Date personale</SectionTitle>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">CNP</div>{selected.cnp}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Localitate</div>{selected.localitate}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Adresă</div>{selected.adresa || '—'}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Telefon</div>{selected.telefon}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</div>{selected.email}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Act identitate</div>{selected.ci_serie} {selected.ci_numar} / {selected.ci_eliberat}</div>
            </div>
            {selected.minor && selected.parinte_nume && (
              <>
                <SectionTitle>Părinte / tutore</SectionTitle>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Nume</div>{selected.parinte_nume}</div>
                  <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">CNP</div>{selected.parinte_cnp}</div>
                </div>
              </>
            )}
            <SectionTitle>Profil</SectionTitle>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Roluri dorite</div>
                <div className="flex flex-wrap gap-1.5">{(selected.rol_dorit || []).map(r => <Badge key={r} variant="blue">{r}</Badge>)}</div>
              </div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Experiență</div><p className="text-gray-600">{selected.experienta_anterioara || '—'}</p></div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Motivație</div><p className="text-gray-600">{selected.motivatie || '—'}</p></div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Pasiuni</div><p className="text-gray-600">{selected.pasiuni || '—'}</p></div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Contribuție</div><p className="text-gray-600">{selected.contributie || '—'}</p></div>
            </div>
            <SectionTitle>Situație</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Ore totale</div>
                <div className="font-serif text-3xl" style={{ color: '#1a6b4a' }}>{selected.ore_totale}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Status</div>
                <Badge variant={STATUS_VARIANT[selected.status] || 'gray'}>{selected.status}</Badge>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ── Editare completă ── */}
      <Modal open={!!edit} onClose={() => setEdit(null)}
        title="Modificare date voluntar"
        subtitle="Toate câmpurile pot fi corectate"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEdit(null)}>Anulează</button>
            <button className="btn btn-primary gap-1.5" onClick={salveaza} disabled={salvez}>
              <Save size={14} /> {salvez ? 'Se salvează...' : 'Salvează modificările'}
            </button>
          </>
        }>
        {edit && (
          <>
            <SectionTitle>Date personale</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <C eticheta="Nume și prenume" camp="nume" latime="col-span-2" />
              <C eticheta="CNP" camp="cnp" />
              <C eticheta="Data nașterii" camp="data_nasterii" tip="date" />
              <C eticheta="Localitate" camp="localitate" />
              <C eticheta="Adresă" camp="adresa" />
              <C eticheta="Telefon" camp="telefon" />
              <C eticheta="Email" camp="email" tip="email" />
            </div>

            <SectionTitle>Act de identitate</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <C eticheta="Seria" camp="ci_serie" />
              <C eticheta="Numărul" camp="ci_numar" />
              <C eticheta="Data eliberării" camp="ci_data_elib" tip="date" />
              <div className="col-span-3"><C eticheta="Eliberat de" camp="ci_eliberat" /></div>
            </div>

            {calcMinor(edit.cnp || '') && (
              <>
                <SectionTitle>Părinte / tutore</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <C eticheta="Nume și prenume" camp="parinte_nume" latime="col-span-2" />
                  <C eticheta="CNP" camp="parinte_cnp" />
                  <C eticheta="Telefon" camp="parinte_telefon" />
                  <C eticheta="Serie CI" camp="parinte_ci_serie" />
                  <C eticheta="Număr CI" camp="parinte_ci_numar" />
                  <C eticheta="Eliberat de" camp="parinte_ci_elib" latime="col-span-2" />
                </div>
              </>
            )}

            <SectionTitle>Instituție și profil</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Tip</label>
                <select className="form-select" value={edit.tip_institutie || 'scoala'} onChange={e => upd('tip_institutie', e.target.value)}>
                  <option value="scoala">Elev / Student</option>
                  <option value="angajat">Angajat</option>
                  <option value="liber">Liber profesionist</option>
                  <option value="altul">Altul</option>
                </select>
              </div>
              <C eticheta="Instituție / loc de muncă" camp="institutie" />
            </div>
            <div className="space-y-3 mt-4">
              {[['pasiuni','Pasiuni'],['asteptari_act','Așteptări activități'],['asteptari_asoc','Așteptări asociație'],
                ['contributie','Contribuție'],['experienta_anterioara','Experiență anterioară'],['motivatie','Motivație']].map(([c, e]) => (
                <div key={c}>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">{e}</label>
                  <textarea className="form-textarea" value={edit[c] || ''} onChange={ev => upd(c, ev.target.value)} />
                </div>
              ))}
            </div>

            <SectionTitle>Roluri dorite</SectionTitle>
            <div className="space-y-2">
              {ROLURI.map(r => (
                <label key={r} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 cursor-pointer">
                  <input type="checkbox" style={{ accentColor: '#1a6b4a', width: 16, height: 16 }}
                    checked={(edit.rol_dorit || []).includes(r)} onChange={() => toggleRol(r)} />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
              <C eticheta="Alt rol" camp="rol_altul" />
            </div>

            <SectionTitle>Situație în asociație</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Status</label>
                <select className="form-select" value={edit.status || 'activ'} onChange={e => upd('status', e.target.value)}>
                  <option value="activ">Activ</option>
                  <option value="inactiv">Inactiv</option>
                  <option value="suspendat">Suspendat</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">
                  <Clock size={11} className="inline" /> Ore totale
                </label>
                <input className="form-input" type="number" step="0.5" min="0"
                  value={edit.ore_totale ?? 0} onChange={e => upd('ore_totale', e.target.value)} />
                <span className="text-xs text-gray-400 italic">Corectează manual dacă e cazul</span>
              </div>
              <C eticheta="Data înrolării" camp="data_inrolare" tip="date" />
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
