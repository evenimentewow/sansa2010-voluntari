import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { X, Users, Hash, Trash2, Plus, Shield, Database } from 'lucide-react'
import Backup from './Backup'

const AN = new Date().getFullYear()
const serieCod = (prefix, an) => `${(prefix || '').toUpperCase()}${an || AN}`
const nrDoc = n => String(n || 0).padStart(3, '0')

const TIPURI = [
  { tip: 'contract',    label: 'Contracte de sponsorizare', ex: 'SNS' },
  { tip: 'chitanta',    label: 'Chitanțe',                  ex: 'CH'  },
  { tip: 'voluntariat', label: 'Contracte de voluntariat',  ex: 'VOL' },
]

export default function AdminPanel({ open, onClose }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('useri')
  const [useri, setUseri] = useState([])
  const [serii, setSerii] = useState([])
  const [loading, setLoading] = useState(true)
  const [nou, setNou] = useState({ email: '', parola: '', nume: '', rol: 'operator' })

  useEffect(() => { if (open) incarca() }, [open])

  async function incarca() {
    setLoading(true)
    const [u, s] = await Promise.all([
      supabase.from('app_users').select('*').order('created_at'),
      supabase.from('serii').select('*').eq('an', AN),
    ])
    setUseri(u.data || [])
    setSerii(s.data || [])
    setLoading(false)
  }

  async function adaugaUser() {
    if (!nou.email || !nou.parola) return alert('Completați emailul și parola')
    const { error } = await supabase.from('app_users').insert({
      email: nou.email.trim().toLowerCase(), parola: nou.parola,
      nume: nou.nume, rol: nou.rol, activ: true,
    })
    if (error) return alert(error.code === '23505' ? 'Există deja un utilizator cu acest email.' : 'Eroare: ' + error.message)
    setNou({ email: '', parola: '', nume: '', rol: 'operator' })
    incarca()
  }

  async function schimbaRol(u, rol) {
    await supabase.from('app_users').update({ rol }).eq('id', u.id)
    incarca()
  }
  async function comutaActiv(u) {
    await supabase.from('app_users').update({ activ: !u.activ }).eq('id', u.id)
    incarca()
  }
  async function resetParola(u) {
    const p = prompt(`Parolă nouă pentru ${u.email}:`)
    if (!p) return
    await supabase.from('app_users').update({ parola: p }).eq('id', u.id)
    alert('Parolă actualizată.')
  }
  async function stergeUser(u) {
    if (u.email === user?.email) return alert('Nu vă puteți șterge propriul cont.')
    if (!confirm(`Ștergi definitiv utilizatorul ${u.email}?`)) return
    await supabase.from('app_users').delete().eq('id', u.id)
    incarca()
  }

  async function salveazaSerie(tip) {
    const prefix = document.getElementById(`ap-pfx-${tip}`).value.trim()
    const numar_start = parseInt(document.getElementById(`ap-start-${tip}`).value) || 1
    const ex = serii.find(s => s.tip === tip && s.an === AN)
    if (ex) await supabase.from('serii').update({ prefix, numar_start }).eq('id', ex.id)
    else await supabase.from('serii').insert({ tip, an: AN, prefix, numar_start })
    incarca()
    alert('Serie salvată.')
  }

  if (!open) return null

  return (
    <div className="admin-overlay no-print" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-panel">
        <div className="admin-head">
          <div className="flex items-center gap-2">
            <Shield size={18} style={{ color: '#1a6b4a' }} />
            <h2 className="font-serif text-xl">Administrare</h2>
          </div>
          <button className="admin-x" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="admin-tabs">
          <button className={`admin-tab ${tab === 'useri' ? 'active' : ''}`} onClick={() => setTab('useri')}>
            <Users size={14} /> Utilizatori
          </button>
          <button className={`admin-tab ${tab === 'serii' ? 'active' : ''}`} onClick={() => setTab('serii')}>
            <Hash size={14} /> Serii documente
          </button>
          <button className={`admin-tab ${tab === 'backup' ? 'active' : ''}`} onClick={() => setTab('backup')}>
            <Database size={14} /> Backup
          </button>
        </div>

        <div className="admin-body">
          {tab === 'backup' ? <Backup /> : loading ? <p className="text-sm text-gray-400">Se încarcă...</p> : tab === 'useri' ? (
            <>
              <div className="p-4 rounded-lg border border-gray-200 mb-5">
                <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1a6b4a' }}>Utilizator nou</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="form-input" placeholder="Email" value={nou.email} onChange={e => setNou(p => ({ ...p, email: e.target.value }))} />
                  <input className="form-input" placeholder="Parolă" value={nou.parola} onChange={e => setNou(p => ({ ...p, parola: e.target.value }))} />
                  <input className="form-input" placeholder="Nume complet" value={nou.nume} onChange={e => setNou(p => ({ ...p, nume: e.target.value }))} />
                  <select className="form-select" value={nou.rol} onChange={e => setNou(p => ({ ...p, rol: e.target.value }))}>
                    <option value="admin">Administrator — acces complet</option>
                    <option value="operator">Operator — fără ștergeri</option>
                    <option value="guest">Guest — doar sponsorizări</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm mt-3 gap-1.5" onClick={adaugaUser}><Plus size={13} /> Adaugă utilizator</button>
              </div>

              <div className="space-y-2">
                {useri.map(u => (
                  <div key={u.id} className="admin-user">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{u.nume || u.email}</div>
                      <div className="text-xs text-gray-400 truncate">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <select className="form-select admin-rol" value={u.rol} onChange={e => schimbaRol(u, e.target.value)}>
                        <option value="admin">admin</option>
                        <option value="operator">operator</option>
                        <option value="guest">guest</option>
                      </select>
                      <button className="btn btn-outline btn-sm" onClick={() => comutaActiv(u)}>
                        {u.activ ? 'Activ' : 'Inactiv'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => resetParola(u)}>Parolă</button>
                      <button className="btn btn-danger btn-sm" onClick={() => stergeUser(u)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Seria se formează din prefix + anul curent și apare în antetul documentelor.</p>
              {TIPURI.map(({ tip, label, ex }) => {
                const s = serii.find(x => x.tip === tip)
                return (
                  <div key={tip} className="p-4 rounded-lg border border-gray-200">
                    <div className="font-medium text-sm mb-3">{label}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Prefix</label>
                        <input className="form-input" id={`ap-pfx-${tip}`} defaultValue={s?.prefix || ex} placeholder={ex} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Număr start</label>
                        <input className="form-input" type="number" id={`ap-start-${tip}`} defaultValue={s?.numar_start || 1} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Exemplu: <strong>{serieCod(s?.prefix || ex, AN)} nr. {nrDoc(s?.numar_start || 1)}</strong>
                    </p>
                    <button className="btn btn-outline btn-sm mt-3" onClick={() => salveazaSerie(tip)}>Salvează</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
