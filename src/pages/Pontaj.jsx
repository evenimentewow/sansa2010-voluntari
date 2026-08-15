import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, Spinner, EmptyState } from '../components/ui'
import { Save, Printer, Download, CheckCircle2, Circle } from 'lucide-react'

const STATUSURI = [
  { value: 'prezent', label: 'Prezent', culoare: '#22c55e', ore: 4 },
  { value: 'partial', label: 'Parțial',  culoare: '#f59e0b', ore: 2 },
  { value: 'absent',  label: 'Absent',   culoare: '#f43f5e', ore: 0 },
]
const zi = d => d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }) : ''
const oreDupa = s => STATUSURI.find(x => x.value === s)?.ore ?? 0

export default function Pontaj() {
  const location = useLocation()
  const [activitati, setActivitati] = useState([])
  const [selAct, setSelAct] = useState(location.state?.actId || '')
  const [voluntari, setVoluntari] = useState([])
  const [pontaj, setPontaj] = useState({})
  const [obs, setObs] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvez, setSalvez] = useState(false)
  const [mesaj, setMesaj] = useState('')

  useEffect(() => {
    supabase.from('activitati').select('*').order('data', { ascending: false })
      .then(({ data }) => {
        setActivitati(data || [])
        if (!selAct && data?.length) setSelAct(data[0].id)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selAct) return
    Promise.all([
      supabase.from('voluntari').select('id,nume,institutie').eq('status', 'activ').order('nume'),
      supabase.from('pontaj').select('*').eq('activitate_id', selAct),
    ]).then(([{ data: v }, { data: p }]) => {
      setVoluntari(v || [])
      const pm = {}, om = {}
      ;(p || []).forEach(x => { pm[x.voluntar_id] = x.status; om[x.voluntar_id] = x.observatii || '' })
      setPontaj(pm); setObs(om); setMesaj('')
    })
  }, [selAct])

  function toateLa(status) {
    const nou = {}
    voluntari.forEach(v => nou[v.id] = status)
    setPontaj(nou)
  }

  async function salveaza() {
    if (!selAct) return
    setSalvez(true); setMesaj('')

    const { data: vechi } = await supabase.from('pontaj').select('*').eq('activitate_id', selAct)
    const vechiMap = {}
    ;(vechi || []).forEach(x => vechiMap[x.voluntar_id] = x)

    const randuri = voluntari.map(v => ({
      activitate_id: selAct, voluntar_id: v.id,
      status: pontaj[v.id] || 'absent',
      ore: oreDupa(pontaj[v.id] || 'absent'),
      observatii: obs[v.id] || null,
    }))

    const { error } = await supabase.from('pontaj').upsert(randuri, { onConflict: 'activitate_id,voluntar_id' })
    if (error) { alert('Eroare: ' + error.message); setSalvez(false); return }

    // Actualizeaza orele totale doar cu diferenta fata de pontajul anterior
    for (const r of randuri) {
      const oreVechi = vechiMap[r.voluntar_id]?.ore ?? 0
      const dif = Number(r.ore) - Number(oreVechi)
      if (dif !== 0) {
        const { data: vol } = await supabase.from('voluntari').select('ore_totale').eq('id', r.voluntar_id).single()
        await supabase.from('voluntari')
          .update({ ore_totale: Math.max(0, (vol?.ore_totale || 0) + dif) })
          .eq('id', r.voluntar_id)
      }
    }

    setSalvez(false)
    setMesaj('Pontajul a fost salvat, iar orele au fost actualizate.')
  }

  function exporta() {
    const act = activitati.find(a => a.id === selAct)
    const randuri = [
      [`LISTĂ DE PREZENȚĂ — ${act?.nume}`],
      [`${zi(act?.data)}${act?.locatie ? ` · ${act.locatie}` : ''}`],
      [],
      ['Nr. crt.', 'Nume și prenume', 'Instituție', 'Prezență', 'Ore', 'Observații'],
      ...voluntari.map((v, i) => [
        i + 1, v.nume, v.institutie,
        STATUSURI.find(s => s.value === (pontaj[v.id] || 'absent'))?.label,
        oreDupa(pontaj[v.id] || 'absent'), obs[v.id] || '',
      ]),
      [], ['', '', 'TOTAL PREZENȚI', prezenti], ['', '', 'TOTAL ORE', totalOre],
    ]
    const csv = randuri.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `prezenta_${(act?.nume || 'activitate').replace(/[^a-zA-Z0-9]/g, '_')}_${act?.data}.csv`
    a.click()
  }

  const act = activitati.find(a => a.id === selAct)
  const prezenti = Object.values(pontaj).filter(s => s === 'prezent').length
  const partiali = Object.values(pontaj).filter(s => s === 'partial').length
  const absenti = voluntari.length - prezenti - partiali
  const totalOre = voluntari.reduce((s, v) => s + oreDupa(pontaj[v.id] || 'absent'), 0)

  if (loading) return <><PageHeader title="Pontaj" /><Spinner /></>

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Pontaj prezență"
          subtitle={act ? `${act.nume} · ${zi(act.data)}` : 'Selectați o activitate'}
          actions={
            <button className="btn btn-primary btn-sm gap-1.5" onClick={salveaza} disabled={salvez || !selAct}>
              <Save size={14} /> {salvez ? 'Se salvează...' : 'Salvează pontajul'}
            </button>
          }
        />
      </div>

      <div className="p-4 sm:p-8 space-y-6">

        <div className="card no-print">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Activitatea</label>
          <select className="form-select" style={{ maxWidth: 460 }} value={selAct} onChange={e => setSelAct(e.target.value)}>
            <option value="">— Selectează —</option>
            {activitati.map(a => <option key={a.id} value={a.id}>{a.nume} · {zi(a.data)}</option>)}
          </select>

          {selAct && voluntari.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-3 mt-5">
                <div className="stat-mini"><div className="stat-mini-num" style={{ color: '#22c55e' }}>{prezenti}</div><div className="stat-mini-lbl">Prezenți</div></div>
                <div className="stat-mini"><div className="stat-mini-num" style={{ color: '#f59e0b' }}>{partiali}</div><div className="stat-mini-lbl">Parțial</div></div>
                <div className="stat-mini"><div className="stat-mini-num" style={{ color: '#f43f5e' }}>{absenti}</div><div className="stat-mini-lbl">Absenți</div></div>
                <div className="stat-mini"><div className="stat-mini-num">{totalOre}</div><div className="stat-mini-lbl">Ore acordate</div></div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs text-gray-500 self-center mr-1">Marchează pe toți ca:</span>
                {STATUSURI.map(s => (
                  <button key={s.value} className="btn btn-outline btn-sm" onClick={() => toateLa(s.value)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {mesaj && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg" style={{ background: '#f0fdf4', color: '#166534' }}>
              <CheckCircle2 size={16} /> <span className="text-sm">{mesaj}</span>
            </div>
          )}
        </div>

        {!selAct
          ? <EmptyState icon="📋" title="Selectați o activitate" subtitle="Alegeți activitatea din lista de mai sus pentru a marca prezența." />
          : voluntari.length === 0
          ? <EmptyState icon="👥" title="Niciun voluntar activ" subtitle="Înrolați voluntari mai întâi." />
          : (
            <div className="card">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
                <div className="card-title" style={{ marginBottom: 0 }}>Listă de prezență</div>
                <div className="flex gap-2 no-print">
                  <button className="btn btn-outline btn-sm gap-1.5" onClick={exporta}><Download size={13} /> Export</button>
                  <button className="btn btn-outline btn-sm gap-1.5" onClick={() => window.print()}><Printer size={13} /> Tipărește</button>
                </div>
              </div>

              <div id="print-area">
                <div className="jurnal-antet">
                  <strong>ASOCIAŢIA „ŞANSA 2010"</strong> · CIF 27772126<br />
                  LISTĂ DE PREZENȚĂ — {act?.nume}<br />
                  {zi(act?.data)}{act?.locatie ? ` · ${act.locatie}` : ''}{act?.coordonator ? ` · coordonator: ${act.coordonator}` : ''}
                </div>

                <div className="overflow-x-auto mt-3">
                  <table className="tbl" style={{ minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 55 }}>Nr.</th>
                        <th>Nume și prenume</th>
                        <th style={{ width: 150 }}>Instituție</th>
                        <th style={{ width: 190 }}>Prezență</th>
                        <th style={{ width: 60 }}>Ore</th>
                        <th style={{ width: 170 }}>Observații</th>
                        <th className="doar-print" style={{ width: 120 }}>Semnătura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voluntari.map((v, i) => {
                        const st = pontaj[v.id] || 'absent'
                        return (
                          <tr key={v.id}>
                            <td className="text-center">{i + 1}</td>
                            <td className="text-sm font-medium">{v.nume}</td>
                            <td className="text-xs text-gray-500">{v.institutie}</td>
                            <td>
                              <div className="prez-grup no-print">
                                {STATUSURI.map(s => (
                                  <button key={s.value} type="button"
                                    className={`prez-btn ${st === s.value ? 'active' : ''}`}
                                    style={st === s.value ? { background: s.culoare, borderColor: s.culoare, color: '#fff' } : undefined}
                                    onClick={() => setPontaj(p => ({ ...p, [v.id]: s.value }))}>
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                              <span className="doar-print">{STATUSURI.find(s => s.value === st)?.label}</span>
                            </td>
                            <td className="font-semibold">{oreDupa(st) || '—'}</td>
                            <td>
                              <input className="obs-input no-print" placeholder="opțional"
                                value={obs[v.id] || ''} onChange={e => setObs(p => ({ ...p, [v.id]: e.target.value }))} />
                              <span className="doar-print">{obs[v.id]}</span>
                            </td>
                            <td className="doar-print"></td>
                          </tr>
                        )
                      })}
                      <tr className="jurnal-total">
                        <td colSpan={3} style={{ textAlign: 'right' }}><strong>TOTAL</strong></td>
                        <td><strong>{prezenti} prezenți, {partiali} parțial</strong></td>
                        <td><strong>{totalOre}</strong></td>
                        <td></td>
                        <td className="doar-print"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="jurnal-semnaturi">
                  <div>Întocmit,<div className="line">{act?.coordonator || 'nume și semnătura'}</div></div>
                  <div>Verificat,<div className="line">nume și semnătura</div></div>
                </div>
              </div>
            </div>
          )
        }
      </div>
    </>
  )
}
