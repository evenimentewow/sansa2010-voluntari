import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, Modal, Spinner, EmptyState, Badge } from '../components/ui'
import { Plus, ClipboardCheck, Trash2 } from 'lucide-react'

const STATUS_LABEL = { planificat: 'Planificat', in_desfasurare: 'În desfășurare', incheiat: 'Încheiat', anulat: 'Anulat' }
const STATUS_VARIANT = { planificat: 'blue', in_desfasurare: 'gold', incheiat: 'green', anulat: 'red' }

export default function Activitati() {
  const navigate = useNavigate()
  const [activitati, setActivitati] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ nume: '', data: '', locatie: '', coordonator: '', descriere: '', status: 'planificat' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchActivitati() }, [])

  async function fetchActivitati() {
    const { data } = await supabase.from('activitati').select('*').order('data', { ascending: false })
    setActivitati(data || [])
    setLoading(false)
  }

  function upd(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.nume || !form.data) { alert('Completați denumirea și data'); return }
    setSaving(true)
    const { error } = await supabase.from('activitati').insert(form)
    if (error) { alert('Eroare: ' + error.message); setSaving(false); return }
    setModalOpen(false)
    setForm({ nume: '', data: '', locatie: '', coordonator: '', descriere: '', status: 'planificat' })
    fetchActivitati()
    setSaving(false)
  }

  async function deleteAct(id) {
    if (!confirm('Ștergi această activitate?')) return
    await supabase.from('activitati').delete().eq('id', id)
    fetchActivitati()
  }

  if (loading) return <><PageHeader title="Activități" /><Spinner /></>

  return (
    <>
      <PageHeader
        title="Activități"
        subtitle="Gestionează activitățile și proiectele asociației"
        actions={
          <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Adaugă activitate
          </button>
        }
      />

      <div className="p-8">
        {activitati.length === 0
          ? <EmptyState icon="📅" title="Nicio activitate" subtitle="Adaugă prima activitate pentru a putea marca prezența." action={<button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Adaugă activitate</button>} />
          : (
            <div className="space-y-3">
              {activitati.map(a => (
                <div key={a.id} className="card flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-base">{a.nume}</h3>
                      <Badge variant={STATUS_VARIANT[a.status] || 'gray'}>{STATUS_LABEL[a.status]}</Badge>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-4">
                      <span>📅 {a.data}</span>
                      {a.locatie && <span>📍 {a.locatie}</span>}
                      {a.coordonator && <span>👤 {a.coordonator}</span>}
                    </div>
                    {a.descriere && <p className="text-sm text-gray-600 mt-1">{a.descriere}</p>}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      className="btn btn-outline btn-sm gap-1.5"
                      onClick={() => navigate('/pontaj', { state: { actId: a.id } })}
                    >
                      <ClipboardCheck size={13} /> Pontaj
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteAct(a.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Activitate nouă"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Anulează</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Se salvează...' : 'Salvează activitatea'}</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Denumire activitate <span className="text-red-500">*</span></label>
            <input className="form-input" value={form.nume} onChange={e => upd('nume', e.target.value)} placeholder="Ex: Atelier Creativitate" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Data <span className="text-red-500">*</span></label>
            <input className="form-input" type="date" value={form.data} onChange={e => upd('data', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Status</label>
            <select className="form-select" value={form.status} onChange={e => upd('status', e.target.value)}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Locație</label>
            <input className="form-input" value={form.locatie} onChange={e => upd('locatie', e.target.value)} placeholder="Ex: Centrul de tineret Pașcani" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Coordonator</label>
            <input className="form-input" value={form.coordonator} onChange={e => upd('coordonator', e.target.value)} placeholder="Numele coordonatorului" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Descriere</label>
            <textarea className="form-textarea" value={form.descriere} onChange={e => upd('descriere', e.target.value)} placeholder="Scurtă descriere a activității..." />
          </div>
        </div>
      </Modal>
    </>
  )
}
