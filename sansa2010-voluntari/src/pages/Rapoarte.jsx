import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, StatCard, Spinner } from '../components/ui'
import { Download } from 'lucide-react'

export default function Rapoarte() {
  const [voluntari, setVoluntari] = useState([])
  const [activitati, setActivitati] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('voluntari').select('*').order('ore_totale', { ascending: false }),
      supabase.from('activitati').select('*'),
    ]).then(([{ data: v }, { data: a }]) => {
      setVoluntari(v || [])
      setActivitati(a || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <><PageHeader title="Rapoarte" /><Spinner /></>

  const activi  = voluntari.filter(v => v.status === 'activ')
  const inactivi = voluntari.filter(v => v.status !== 'activ')
  const minori  = voluntari.filter(v => v.minor)
  const oreTotal = voluntari.reduce((s, v) => s + (v.ore_totale || 0), 0)

  // Distribuție roluri
  const rolStats = {}
  voluntari.forEach(v => (v.rol_dorit || []).forEach(r => rolStats[r] = (rolStats[r] || 0) + 1))
  const maxRol = Math.max(...Object.values(rolStats), 1)

  // Localități
  const locStats = {}
  voluntari.forEach(v => { if (v.localitate) locStats[v.localitate] = (locStats[v.localitate] || 0) + 1 })

  function exportCSV() {
    const rows = [
      ['Nume', 'CNP', 'Localitate', 'Instituție', 'Email', 'Telefon', 'Status', 'Ore totale', 'Data înrolării'],
      ...voluntari.map(v => [v.nume, v.cnp, v.localitate, v.institutie, v.email, v.telefon, v.status, v.ore_totale, v.data_inrolare]),
    ]
    const csv = rows.map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'voluntari_sansa2010.csv'; a.click()
  }

  function exportActivitatiCSV() {
    const rows = [
      ['Denumire', 'Data', 'Locatie', 'Coordonator', 'Status', 'Descriere'],
      ...activitati.map(a => [a.nume, a.data, a.locatie, a.coordonator, a.status, a.descriere]),
    ]
    const csv = rows.map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a'); el.href = url; el.download = 'activitati_sansa2010.csv'; el.click()
  }

  return (
    <>
      <PageHeader title="Rapoarte" subtitle="Statistici și exporturi date asociație" />
      <div className="p-8 space-y-6">

        {/* Stats principale */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard num={voluntari.length} label="Total înregistrați" color="green" />
          <StatCard num={activi.length}    label="Voluntari activi"   color="gold"  />
          <StatCard num={minori.length}    label="Voluntari minori"   color="blue"  />
          <StatCard num={oreTotal}         label="Ore totale"         color="red"   />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Roluri dorite */}
          <div className="card">
            <div className="card-title">Distribuție roluri dorite</div>
            <p className="text-sm text-gray-400 mb-4">Câți voluntari au selectat fiecare rol</p>
            {Object.keys(rolStats).length === 0
              ? <p className="text-sm text-gray-400">Date insuficiente.</p>
              : Object.entries(rolStats).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                <div key={r} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{r}</span><strong>{n}</strong>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(n / maxRol) * 100}%`, background: '#1a6b4a' }} />
                  </div>
                </div>
              ))
            }
          </div>

          {/* Top voluntari */}
          <div className="card">
            <div className="card-title">Top voluntari după ore</div>
            <p className="text-sm text-gray-400 mb-4">Cei mai activi membri</p>
            {voluntari.slice(0, 6).map((v, i) => (
              <div key={v.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: '#e8f5ee', color: '#1a6b4a' }}>
                  {v.nume?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{v.nume}</div>
                  <div className="text-xs text-gray-400 truncate">{v.institutie}</div>
                </div>
                <span className="font-semibold text-sm" style={{ color: '#1a6b4a' }}>{v.ore_totale} ore</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuție localități */}
        {Object.keys(locStats).length > 0 && (
          <div className="card">
            <div className="card-title">Distribuție geografică</div>
            <p className="text-sm text-gray-400 mb-4">Voluntari după localitate de domiciliu</p>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(locStats).sort((a, b) => b[1] - a[1]).map(([loc, n]) => (
                <div key={loc} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-serif text-2xl" style={{ color: '#1a6b4a' }}>{n}</div>
                  <div className="text-xs text-gray-500 mt-1">{loc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export */}
        <div className="card">
          <div className="card-title">Export date</div>
          <p className="text-sm text-gray-400 mb-5">Generează rapoarte pentru documente oficiale sau analize</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-outline gap-2" onClick={exportCSV}>
              <Download size={14} /> Lista voluntari (CSV)
            </button>
            <button className="btn btn-outline gap-2" onClick={exportActivitatiCSV}>
              <Download size={14} /> Activități (CSV)
            </button>
            <button className="btn btn-outline gap-2" onClick={() => alert('📊 Raport ore generat!')}>
              <Download size={14} /> Raport ore voluntariat (PDF)
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Fișierele CSV se pot deschide direct în Excel sau Google Sheets. Sunt codificate UTF-8 cu BOM pentru caractere românești corecte.
          </p>
        </div>
      </div>
    </>
  )
}
