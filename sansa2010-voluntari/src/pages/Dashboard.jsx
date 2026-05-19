import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, StatCard, Badge, Avatar, Spinner } from '../components/ui'
import { UserPlus, BarChart3 } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, activi: 0, activitati: 0, ore: 0 })
  const [recentVoluntari, setRecentVoluntari] = useState([])
  const [activitati, setActivitati] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const [{ data: vol }, { data: act }] = await Promise.all([
      supabase.from('voluntari').select('id,nume,email,institutie,status,data_inrolare,ore_totale').order('created_at', { ascending: false }),
      supabase.from('activitati').select('*').order('data', { ascending: true }).gte('data', new Date().toISOString().slice(0, 10)).limit(4),
    ])

    const voluntari = vol || []
    const oreTotal = voluntari.reduce((s, v) => s + (v.ore_totale || 0), 0)
    setStats({
      total: voluntari.length,
      activi: voluntari.filter(v => v.status === 'activ').length,
      activitati: (act || []).length,
      ore: oreTotal,
    })
    setRecentVoluntari(voluntari.slice(0, 5))
    setActivitati(act || [])
    setLoading(false)
  }

  if (loading) return <><PageHeader title="Dashboard" /><Spinner /></>

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Bun venit · Asociația ȘANSA 2010"
        actions={
          <>
            <Link to="/rapoarte" className="btn btn-outline btn-sm gap-1.5">
              <BarChart3 size={14} /> Rapoarte
            </Link>
            <Link to="/inrolare" className="btn btn-primary btn-sm gap-1.5">
              <UserPlus size={14} /> Înrolează voluntar
            </Link>
          </>
        }
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard num={stats.total}      label="Voluntari înregistrați" color="green" />
          <StatCard num={stats.activi}     label="Voluntari activi"       color="gold"  />
          <StatCard num={stats.activitati} label="Activități viitoare"    color="blue"  />
          <StatCard num={stats.ore}        label="Ore totale voluntariat" color="red"   />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Voluntari recenți */}
          <div className="card">
            <div className="card-title">Voluntari recenți</div>
            <p className="text-sm text-gray-400 mb-4">Ultimele înrolări</p>
            {recentVoluntari.length === 0
              ? <p className="text-sm text-gray-400">Niciun voluntar înrolat încă.</p>
              : recentVoluntari.map(v => (
                <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <Avatar name={v.nume} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{v.nume}</div>
                    <div className="text-xs text-gray-400 truncate">{v.institutie} · {v.data_inrolare}</div>
                  </div>
                  <Badge variant={v.status === 'activ' ? 'green' : 'gray'}>{v.status}</Badge>
                </div>
              ))
            }
            <Link to="/voluntari" className="btn btn-outline btn-sm mt-4">
              Vezi toți voluntarii →
            </Link>
          </div>

          {/* Activități viitoare */}
          <div className="card">
            <div className="card-title">Activități viitoare</div>
            <p className="text-sm text-gray-400 mb-4">Programate în calendar</p>
            {activitati.length === 0
              ? <p className="text-sm text-gray-400">Nicio activitate planificată.</p>
              : activitati.map(a => (
                <div key={a.id} className="py-2.5 border-b border-gray-50 last:border-0">
                  <div className="font-medium text-sm">{a.nume}</div>
                  <div className="text-xs text-gray-400 mt-1">📅 {a.data} · 📍 {a.locatie}</div>
                  <div className="text-xs text-gray-400">👤 {a.coordonator}</div>
                </div>
              ))
            }
            <Link to="/activitati" className="btn btn-outline btn-sm mt-4">
              Gestionează activitățile →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
