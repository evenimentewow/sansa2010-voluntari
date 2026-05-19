import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, Badge, Avatar, Modal, SectionTitle, Spinner, EmptyState } from '../components/ui'
import { Search, UserPlus, FileText } from 'lucide-react'

const STATUS_VARIANT = { activ: 'green', inactiv: 'gray', suspendat: 'red' }

export default function Voluntari() {
  const [voluntari, setVoluntari] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('toti')
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchVoluntari() }, [])

  useEffect(() => {
    let list = voluntari
    if (filterStatus !== 'toti') list = list.filter(v => v.status === filterStatus)
    if (search) list = list.filter(v =>
      v.nume?.toLowerCase().includes(search.toLowerCase()) ||
      v.localitate?.toLowerCase().includes(search.toLowerCase()) ||
      v.email?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(list)
  }, [voluntari, search, filterStatus])

  async function fetchVoluntari() {
    const { data } = await supabase.from('voluntari').select('*').order('created_at', { ascending: false })
    setVoluntari(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  const counts = {
    toti: voluntari.length,
    activ: voluntari.filter(v => v.status === 'activ').length,
    inactiv: voluntari.filter(v => v.status === 'inactiv').length,
  }

  return (
    <>
      <PageHeader
        title="Voluntari"
        subtitle={`${counts.activ} activi din ${counts.toti} înregistrați`}
        actions={
          <Link to="/inrolare" className="btn btn-primary btn-sm gap-1.5">
            <UserPlus size={14} /> Înrolează voluntar nou
          </Link>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-72">
            <Search size={15} className="text-gray-400" />
            <input
              className="flex-1 text-sm outline-none"
              placeholder="Caută după nume, localitate, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {['toti', 'activ', 'inactiv'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filterStatus === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{ border: 'none', cursor: 'pointer' }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Niciun voluntar găsit"
            subtitle="Încearcă alt termen de căutare sau înrolează un voluntar nou."
            action={<Link to="/inrolare" className="btn btn-primary">+ Înrolează voluntar</Link>}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Voluntar</th>
                  <th>CNP</th>
                  <th>Localitate</th>
                  <th>Instituție</th>
                  <th>Roluri dorite</th>
                  <th>Ore</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={v.nume} />
                        <div>
                          <div className="font-medium text-sm">{v.nume}</div>
                          <div className="text-xs text-gray-400">{v.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-gray-500 font-mono">{v.cnp}</td>
                    <td className="text-sm">{v.localitate}</td>
                    <td className="text-xs text-gray-600">{v.institutie}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(v.rol_dorit || []).slice(0, 2).map(r => (
                          <Badge key={r} variant="blue" style={{ fontSize: 10 }}>{r}</Badge>
                        ))}
                        {(v.rol_dorit || []).length > 2 && (
                          <Badge variant="gray">+{v.rol_dorit.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold">{v.ore_totale}</span>
                      <span className="text-xs text-gray-400"> ore</span>
                    </td>
                    <td>
                      <Badge variant={STATUS_VARIANT[v.status] || 'gray'}>{v.status}</Badge>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelected(v)}
                        className="btn btn-outline btn-sm"
                      >
                        Detalii
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.nume}
        subtitle={`${selected?.institutie} · Înrolat: ${selected?.data_inrolare}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setSelected(null)}>Închide</button>
            <Link to="/contracte" className="btn btn-gold gap-1.5" onClick={() => setSelected(null)}>
              <FileText size={14} /> Generează contract
            </Link>
          </>
        }
      >
        {selected && (
          <>
            <SectionTitle>Date personale</SectionTitle>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CNP</div>{selected.cnp}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Localitate</div>{selected.localitate}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Telefon</div>{selected.telefon}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</div>{selected.email}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Act identitate</div>Seria {selected.ci_serie} nr. {selected.ci_numar} / {selected.ci_eliberat}</div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Vârstă</div>{selected.minor ? '⚠️ Minor' : 'Major'}</div>
            </div>
            {selected.minor && (selected.parinte_nume) && (
              <>
                <SectionTitle>Părinte / Tutore</SectionTitle>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nume</div>{selected.parinte_nume}</div>
                  <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CNP</div>{selected.parinte_cnp}</div>
                </div>
              </>
            )}
            <SectionTitle>Profil voluntar</SectionTitle>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Roluri dorite</div>
                <div className="flex flex-wrap gap-1.5">
                  {(selected.rol_dorit || []).map(r => <Badge key={r} variant="blue">{r}</Badge>)}
                </div>
              </div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Experiență anterioară</div><p className="text-gray-600">{selected.experienta_anterioara || '—'}</p></div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Motivație</div><p className="text-gray-600">{selected.motivatie || '—'}</p></div>
              <div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pasiuni</div><p className="text-gray-600">{selected.pasiuni || '—'}</p></div>
            </div>
            <SectionTitle>Statistici</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ore totale</div>
                <div className="font-serif text-3xl" style={{ color: '#1a6b4a' }}>{selected.ore_totale}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</div>
                <Badge variant={STATUS_VARIANT[selected.status] || 'gray'} className="mt-1">{selected.status}</Badge>
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
