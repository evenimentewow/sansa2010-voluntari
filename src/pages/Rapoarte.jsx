import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, StatCard, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Download, CalendarRange, HandCoins, Users } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2 }).format(n || 0)
const zi = d => new Date(d).toLocaleDateString('ro-RO')
const iso = d => d.toISOString().slice(0, 10)
const serieCod = (p, a) => `${(p || '').toUpperCase()}${a || new Date().getFullYear()}`
const nrDoc = n => String(n || 0).padStart(3, '0')

// Perioade predefinite
function perioade() {
  const azi = new Date()
  const an = azi.getFullYear()
  const luna = azi.getMonth()
  const trim = Math.floor(luna / 3)
  return {
    luna_curenta:   { de: iso(new Date(an, luna, 1)),        la: iso(azi), eticheta: 'Luna curentă' },
    luna_trecuta:   { de: iso(new Date(an, luna - 1, 1)),    la: iso(new Date(an, luna, 0)), eticheta: 'Luna trecută' },
    trim_curent:    { de: iso(new Date(an, trim * 3, 1)),    la: iso(azi), eticheta: 'Trimestrul curent' },
    an_curent:      { de: iso(new Date(an, 0, 1)),           la: iso(azi), eticheta: 'Anul curent' },
    an_trecut:      { de: iso(new Date(an - 1, 0, 1)),       la: iso(new Date(an - 1, 11, 31)), eticheta: 'Anul trecut' },
    tot:            { de: '2000-01-01',                       la: iso(azi), eticheta: 'Toată perioada' },
  }
}

function exportaCSV(nume, randuri) {
  const csv = randuri.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nume; a.click()
  URL.revokeObjectURL(url)
}

export default function Rapoarte() {
  const { user } = useAuth()
  const isGuest = user?.rol === 'guest'
  const [voluntari, setVoluntari] = useState([])
  const [activitati, setActivitati] = useState([])
  const [sponsorizari, setSponsorizari] = useState([])
  const [pontaje, setPontaje] = useState([])
  const [loading, setLoading] = useState(true)

  const P = perioade()
  const [presetSel, setPresetSel] = useState('an_curent')
  const [de, setDe] = useState(P.an_curent.de)
  const [la, setLa] = useState(P.an_curent.la)

  useEffect(() => { incarca() }, [])

  async function incarca() {
    const esteGuest = user?.rol === 'guest'
    const s = await supabase.from('sponsorizari').select('*').order('numar', { ascending: false })
    setSponsorizari(s.data || [])

    if (!esteGuest) {
      const [v, a, p] = await Promise.all([
        supabase.from('voluntari').select('*').order('ore_totale', { ascending: false }),
        supabase.from('activitati').select('*'),
        supabase.from('pontaj').select('*'),
      ])
      setVoluntari(v.data || []); setActivitati(a.data || []); setPontaje(p.data || [])
    }
    setLoading(false)
  }

  function aplicaPreset(k) {
    setPresetSel(k)
    if (k === 'personalizat') return
    setDe(P[k].de); setLa(P[k].la)
  }

  const inInterval = (data) => {
    if (!data) return false
    const d = String(data).slice(0, 10)
    return d >= de && d <= la
  }

  // ── Date filtrate ──────────────────────────────────────────────
  const spF = useMemo(() => sponsorizari.filter(s => inInterval(s.data_contract)), [sponsorizari, de, la])
  const volF = useMemo(() => voluntari.filter(v => inInterval(v.data_inrolare)), [voluntari, de, la])
  const actF = useMemo(() => activitati.filter(a => inInterval(a.data)), [activitati, de, la])

  const totalSume   = spF.reduce((s, x) => s + Number(x.suma || 0), 0)
  const cuChitanta  = spF.filter(s => s.are_chitanta)
  const sumaChit    = cuChitanta.reduce((s, x) => s + Number(x.suma || 0), 0)

  // Sponsorizari pe luni
  const peLuni = useMemo(() => {
    const m = {}
    spF.forEach(s => {
      const k = String(s.data_contract).slice(0, 7)
      if (!m[k]) m[k] = { nr: 0, suma: 0 }
      m[k].nr++; m[k].suma += Number(s.suma || 0)
    })
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]))
  }, [spF])
  const maxLuna = Math.max(...peLuni.map(([, v]) => v.suma), 1)

  // Top sponsori
  const topSponsori = useMemo(() => {
    const m = {}
    spF.forEach(s => {
      const k = s.sponsor_denumire || '—'
      if (!m[k]) m[k] = { nr: 0, suma: 0, cui: s.sponsor_cui }
      m[k].nr++; m[k].suma += Number(s.suma || 0)
    })
    return Object.entries(m).sort((a, b) => b[1].suma - a[1].suma).slice(0, 8)
  }, [spF])

  // Voluntari
  const activi = volF.filter(v => v.status === 'activ')
  const minori = volF.filter(v => v.minor)
  const oreTotal = volF.reduce((s, v) => s + (v.ore_totale || 0), 0)
  const rolStats = useMemo(() => {
    const m = {}
    volF.forEach(v => (v.rol_dorit || []).forEach(r => m[r] = (m[r] || 0) + 1))
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [volF])
  const maxRol = Math.max(...rolStats.map(([, n]) => n), 1)

  // ── Exporturi ──────────────────────────────────────────────────
  const suf = `${de}_${la}`

  const expSponsorizari = () => exportaCSV(`sponsorizari_${suf}.csv`, [
    ['Serie', 'Numar', 'Data', 'Sponsor', 'CUI', 'Reg. Com.', 'Suma RON', 'Data limita', 'Chitanta', 'Semnatar 1', 'Semnatar 2', 'Observatii', 'Introdus de'],
    ...spF.map(s => [
      serieCod(s.serie_prefix, s.serie_an), nrDoc(s.numar), zi(s.data_contract),
      s.sponsor_denumire, s.sponsor_cui, s.sponsor_reg_com, Number(s.suma || 0).toFixed(2),
      s.data_limita ? zi(s.data_limita) : '',
      s.are_chitanta ? `${serieCod(s.chitanta_prefix, s.serie_an)}/${nrDoc(s.chitanta_numar)}` : '',
      s.semnatar1_nume, s.semnatar2_nume, s.observatii, s.introdus_de,
    ]),
    [], ['TOTAL', '', '', `${spF.length} contracte`, '', '', totalSume.toFixed(2)],
  ])

  const expSinteza = () => exportaCSV(`sinteza_sponsorizari_${suf}.csv`, [
    [`Sinteza sponsorizari: ${zi(de)} - ${zi(la)}`],
    [],
    ['Indicator', 'Valoare'],
    ['Numar contracte', spF.length],
    ['Numar chitante', cuChitanta.length],
    ['Suma totala RON', totalSume.toFixed(2)],
    ['Suma incasata cu chitanta RON', sumaChit.toFixed(2)],
    [],
    ['Luna', 'Nr. contracte', 'Suma RON'],
    ...peLuni.map(([k, v]) => [k, v.nr, v.suma.toFixed(2)]),
    [],
    ['Sponsor', 'Nr. contracte', 'Suma RON'],
    ...topSponsori.map(([n, v]) => [n, v.nr, v.suma.toFixed(2)]),
  ])

  const expVoluntari = () => exportaCSV(`voluntari_${suf}.csv`, [
    ['Nume', 'CNP', 'Localitate', 'Institutie', 'Email', 'Telefon', 'Minor', 'Status', 'Ore totale', 'Data inrolarii', 'Roluri dorite'],
    ...volF.map(v => [v.nume, v.cnp, v.localitate, v.institutie, v.email, v.telefon,
      v.minor ? 'DA' : 'NU', v.status, v.ore_totale, v.data_inrolare, (v.rol_dorit || []).join('; ')]),
  ])

  const expActivitati = () => exportaCSV(`activitati_${suf}.csv`, [
    ['Denumire', 'Data', 'Locatie', 'Coordonator', 'Status', 'Prezenti', 'Descriere'],
    ...actF.map(a => [a.nume, a.data, a.locatie, a.coordonator, a.status,
      pontaje.filter(p => p.activitate_id === a.id && p.status === 'prezent').length, a.descriere]),
  ])

  const expOre = () => exportaCSV(`ore_voluntariat_${suf}.csv`, [
    ['Voluntar', 'Institutie', 'Ore totale', 'Status'],
    ...volF.map(v => [v.nume, v.institutie, v.ore_totale, v.status]),
    [], ['TOTAL ORE', '', oreTotal],
  ])

  if (loading) return <><PageHeader title="Rapoarte" /><Spinner /></>

  return (
    <>
      <PageHeader title="Rapoarte" subtitle={`Perioada analizată: ${zi(de)} — ${zi(la)}`} />

      <div className="p-4 sm:p-8 space-y-6">

        {/* SELECTOR PERIOADA */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarRange size={16} style={{ color: '#1a6b4a' }} />
            <span className="font-medium text-sm">Perioada raportului</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(P).map(([k, v]) => (
              <button key={k}
                className={`period-chip ${presetSel === k ? 'active' : ''}`}
                onClick={() => aplicaPreset(k)}>
                {v.eticheta}
              </button>
            ))}
            <button className={`period-chip ${presetSel === 'personalizat' ? 'active' : ''}`}
              onClick={() => setPresetSel('personalizat')}>
              Interval personalizat
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">De la</label>
              <input className="form-input" type="date" value={de}
                onChange={e => { setDe(e.target.value); setPresetSel('personalizat') }} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Până la</label>
              <input className="form-input" type="date" value={la}
                onChange={e => { setLa(e.target.value); setPresetSel('personalizat') }} />
            </div>
          </div>
        </div>

        {/* ══ SPONSORIZĂRI ══ */}
        <div className="rap-sectiune">
          <HandCoins size={17} style={{ color: '#c8a84b' }} />
          <span>Sponsorizări</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard num={spF.length}          label="Contracte emise"     color="gold" />
          <StatCard num={cuChitanta.length}   label="Chitanțe emise"      color="blue" />
          <StatCard num={fmt(totalSume)}      label="Suma totală (RON)"   color="green" />
          <StatCard num={fmt(sumaChit)}       label="Încasat cu chitanță" color="red" />
        </div>

        {spF.length === 0 ? (
          <div className="card"><p className="text-sm text-gray-400">Nicio sponsorizare în perioada selectată.</p></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <div className="card-title">Evoluție lunară</div>
                <p className="text-sm text-gray-400 mb-4">Sume încasate pe luni</p>
                {peLuni.map(([k, v]) => (
                  <div key={k} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{k} <span className="text-gray-400">({v.nr} contr.)</span></span>
                      <strong>{fmt(v.suma)} RON</strong>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(v.suma / maxLuna) * 100}%`, background: '#c8a84b' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-title">Top sponsori</div>
                <p className="text-sm text-gray-400 mb-4">După suma totală sponsorizată</p>
                {topSponsori.map(([nume, v], i) => (
                  <div key={nume} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{nume}</div>
                      <div className="text-xs text-gray-400">{v.nr} {v.nr === 1 ? 'contract' : 'contracte'}{v.cui ? ` · CUI ${v.cui}` : ''}</div>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: '#c8a84b' }}>{fmt(v.suma)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Detaliu contracte în perioadă</div>
              <div className="overflow-x-auto mt-3">
                <table className="tbl" style={{ minWidth: 620 }}>
                  <thead><tr><th>Serie / Nr.</th><th>Data</th><th>Sponsor</th><th>Suma</th><th>Chitanță</th></tr></thead>
                  <tbody>
                    {spF.map(s => (
                      <tr key={s.id}>
                        <td className="text-sm"><strong>{serieCod(s.serie_prefix, s.serie_an)}</strong> / {nrDoc(s.numar)}</td>
                        <td className="text-sm text-gray-500">{zi(s.data_contract)}</td>
                        <td className="text-sm font-medium">{s.sponsor_denumire}</td>
                        <td className="font-semibold">{fmt(s.suma)} RON</td>
                        <td className="text-xs text-gray-500">{s.are_chitanta ? `${serieCod(s.chitanta_prefix, s.serie_an)}/${nrDoc(s.chitanta_numar)}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <button className="btn btn-primary gap-2" onClick={expSponsorizari}>
                  <Download size={14} /> Export detaliat (CSV)
                </button>
                <button className="btn btn-outline gap-2" onClick={expSinteza}>
                  <Download size={14} /> Export sinteză (CSV)
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══ VOLUNTARI ══ */}
        {!isGuest && <>
        <div className="rap-sectiune">
          <Users size={17} style={{ color: '#1a6b4a' }} />
          <span>Voluntari și activități</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard num={volF.length}     label="Înrolați în perioadă" color="green" />
          <StatCard num={activi.length}   label="Voluntari activi"     color="gold" />
          <StatCard num={minori.length}   label="Voluntari minori"     color="blue" />
          <StatCard num={oreTotal}        label="Ore voluntariat"      color="red" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <div className="card-title">Distribuție roluri dorite</div>
            <p className="text-sm text-gray-400 mb-4">Voluntari înrolați în perioadă</p>
            {rolStats.length === 0
              ? <p className="text-sm text-gray-400">Date insuficiente pentru perioada selectată.</p>
              : rolStats.map(([r, n]) => (
                <div key={r} className="mb-3">
                  <div className="flex justify-between text-sm mb-1"><span>{r}</span><strong>{n}</strong></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(n / maxRol) * 100}%`, background: '#1a6b4a' }} />
                  </div>
                </div>
              ))
            }
          </div>

          <div className="card">
            <div className="card-title">Activități în perioadă</div>
            <p className="text-sm text-gray-400 mb-4">{actF.length} {actF.length === 1 ? 'activitate' : 'activități'}</p>
            {actF.length === 0
              ? <p className="text-sm text-gray-400">Nicio activitate în perioada selectată.</p>
              : actF.map(a => (
                <div key={a.id} className="py-2 border-b border-gray-50 last:border-0">
                  <div className="text-sm font-medium">{a.nume}</div>
                  <div className="text-xs text-gray-400">
                    {zi(a.data)} · {a.locatie || '—'} · {pontaje.filter(p => p.activitate_id === a.id && p.status === 'prezent').length} prezenți
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="card">
          <div className="card-title">Export date voluntari</div>
          <p className="text-sm text-gray-400 mb-4">Fișierele CSV se deschid direct în Excel, codificate UTF-8 cu diacritice corecte.</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-outline gap-2" onClick={expVoluntari}><Download size={14} /> Listă voluntari</button>
            <button className="btn btn-outline gap-2" onClick={expOre}><Download size={14} /> Raport ore</button>
            <button className="btn btn-outline gap-2" onClick={expActivitati}><Download size={14} /> Activități</button>
          </div>
        </div>
        </>}
      </div>
    </>
  )
}
