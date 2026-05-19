import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, Spinner, EmptyState } from '../components/ui'
import { Save } from 'lucide-react'

const STATUS_OPTS = [
  { value: 'prezent', label: 'Prezent', color: '#22c55e' },
  { value: 'partial', label: 'Parțial', color: '#f59e0b' },
  { value: 'absent',  label: 'Absent',  color: '#f43f5e' },
]

export default function Pontaj() {
  const location = useLocation()
  const [activitati, setActivitati] = useState([])
  const [selAct, setSelAct] = useState(location.state?.actId || '')
  const [voluntari, setVoluntari] = useState([])
  const [pontaj, setPontaj] = useState({})
  const [obs, setObs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('activitati').select('id,nume,data,locatie').order('data', { ascending: false })
      .then(({ data }) => { setActivitati(data || []); if (!selAct && data?.length) setSelAct(data[0].id); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!selAct) return
    Promise.all([
      supabase.from('voluntari').select('id,nume,institutie').eq('status', 'activ').order('nume'),
      supabase.from('pontaj').select('*').eq('activitate_id', selAct),
    ]).then(([{ data: v }, { data: p }]) => {
      setVoluntari(v || [])
      const pMap = {}; const oMap = {}
      ;(p || []).forEach(x => { pMap[x.voluntar_id] = x.status; oMap[x.voluntar_id] = x.observatii || '' })
      setPontaj(pMap)
      setObs(oMap)
    })
  }, [selAct])

  async function savePontaj() {
    if (!selAct) return
    setSaving(true)
    const rows = voluntari.map(v => ({
      activitate_id: selAct,
      voluntar_id: v.id,
      status: pontaj[v.id] || 'absent',
      ore: pontaj[v.id] === 'prezent' ? 4 : pontaj[v.id] === 'partial' ? 2 : 0,
      observatii: obs[v.id] || null,
    }))

    const { error } = await supabase.from('pontaj').upsert(rows, { onConflict: 'activitate_id,voluntar_id' })
    if (error) { alert('Eroare: ' + error.message); setSaving(false); return }

    // Actualizare ore totale per voluntar
    for (const v of voluntari) {
      const ore = rows.find(r => r.voluntar_id === v.id)?.ore || 0
      if (ore > 0) {
        await supabase.rpc('increment_ore', { vol_id: v.id, ore_add: ore }).catch(() => null)
      }
    }

    alert('✅ Pontaj salvat! Orele au fost actualizate.')
    setSaving(false)
  }

  const actCurenta = activitati.find(a => a.id === selAct)
  const prezenti = Object.values(pontaj).filter(s => s === 'prezent').length
  const partiali = Object.values(pontaj).filter(s => s === 'partial').length

  if (loading) return <><PageHeader title="Pontaj" /><Spinner /></>

  return (
    <>
      <PageHeader
        title="Pontaj prezență"
        subtitle={actCurenta ? `${actCurenta.nume} · ${actCurenta.data}` : 'Selectează o activitate'}
        actions={
          <button className="btn btn-primary btn-sm gap-1.5" onClick={savePontaj} disabled={saving || !selAct}>
            <Save size={14} /> {saving ? 'Se salvează...' : 'Salvează pontaj'}
          </button>
        }
      />

      <div className="p-8">
        {/* Selector activitate */}
        <div className="card mb-6">
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Selectează activitatea</label>
              <select className="form-select" value={selAct} onChange={e => setSelAct(e.target.value)}>
                <option value="">— Selectează —</option>
                {activitati.map(a => <option key={a.id} value={a.id}>{a.nume} · {a.data}</option>)}
              </select>
            </div>
            {selAct && (
              <div className="flex gap-4 text-sm">
                <div className="text-center"><div className="font-serif text-2xl" style={{ color: '#22c55e' }}>{prezenti}</div><div className="text-xs text-gray-400">Prezenți</div></div>
                <div className="text-center"><div className="font-serif text-2xl" style={{ color: '#f59e0b' }}>{partiali}</div><div className="text-xs text-gray-400">Parțial</div></div>
                <div className="text-center"><div className="font-serif text-2xl" style={{ color: '#f43f5e' }}>{voluntari.length - prezenti - partiali}</div><div className="text-xs text-gray-400">Absenți</div></div>
              </div>
            )}
          </div>
        </div>

        {/* Tabel pontaj */}
        {!selAct
          ? <EmptyState icon="📋" title="Selectează o activitate" subtitle="Alege activitatea din lista de mai sus pentru a marca prezența." />
          : voluntari.length === 0
          ? <EmptyState icon="👥" title="Niciun voluntar activ" subtitle="Înrolează voluntari mai întâi." />
          : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Voluntar</th>
                    <th>Instituție</th>
                    <th>Prezență</th>
                    <th>Ore</th>
                    <th>Observații</th>
                  </tr>
                </thead>
                <tbody>
                  {voluntari.map(v => {
                    const status = pontaj[v.id] || 'absent'
                    const ore = status === 'prezent' ? 4 : status === 'partial' ? 2 : 0
                    return (
                      <tr key={v.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_OPTS.find(s => s.value === status)?.color || '#cbd5e1' }} />
                            <span className="font-medium text-sm">{v.nume}</span>
                          </div>
                        </td>
                        <td className="text-xs text-gray-500">{v.institutie}</td>
                        <td>
                          <select
                            className="form-select"
                            style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
                            value={status}
                            onChange={e => setPontaj(p => ({ ...p, [v.id]: e.target.value }))}
                          >
                            {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="text-sm font-medium">{ore > 0 ? `${ore} ore` : '—'}</td>
                        <td>
                          <input
                            className="form-input"
                            style={{ padding: '5px 10px', fontSize: 13 }}
                            placeholder="Observații..."
                            value={obs[v.id] || ''}
                            onChange={e => setObs(p => ({ ...p, [v.id]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </>
  )
}
