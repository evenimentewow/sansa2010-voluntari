import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Download, Database, CheckCircle2, AlertCircle } from 'lucide-react'

const TABELE = [
  { nume: 'voluntari',     eticheta: 'Voluntari' },
  { nume: 'sponsorizari',  eticheta: 'Contracte de sponsorizare' },
  { nume: 'contracte',     eticheta: 'Contracte de voluntariat' },
  { nume: 'activitati',    eticheta: 'Activități' },
  { nume: 'pontaj',        eticheta: 'Pontaj prezență' },
  { nume: 'imputerniciti', eticheta: 'Persoane împuternicite' },
  { nume: 'serii',         eticheta: 'Serii documente' },
  { nume: 'app_users',     eticheta: 'Utilizatori aplicație' },
]

const azi = () => new Date().toISOString().slice(0, 10)

function descarca(continut, numeFisier, tip) {
  const blob = new Blob([continut], { type: tip })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = numeFisier; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Converteste un tabel in CSV
function tabelCSV(randuri) {
  if (!randuri || !randuri.length) return ''
  const coloane = Object.keys(randuri[0])
  const cap = coloane.join(',')
  const corp = randuri.map(r => coloane.map(c => {
    let v = r[c]
    if (v === null || v === undefined) v = ''
    else if (Array.isArray(v)) v = v.join('; ')
    else if (typeof v === 'object') v = JSON.stringify(v)
    return `"${String(v).replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
  return `${cap}\r\n${corp}`
}

export default function Backup() {
  const [lucreaza, setLucreaza] = useState(false)
  const [pas, setPas] = useState('')
  const [rezultat, setRezultat] = useState(null)
  const [eroare, setEroare] = useState('')

  async function citesteTot() {
    const date = {}
    const statistici = []
    for (const t of TABELE) {
      setPas(`Se citește: ${t.eticheta}...`)
      const { data, error } = await supabase.from(t.nume).select('*')
      if (error) {
        date[t.nume] = []
        statistici.push({ ...t, nr: 0, problema: true })
      } else {
        date[t.nume] = data || []
        statistici.push({ ...t, nr: (data || []).length, problema: false })
      }
    }
    return { date, statistici }
  }

  // Backup complet — un singur fisier JSON, restaurabil
  async function backupJSON() {
    setLucreaza(true); setEroare(''); setRezultat(null)
    try {
      const { date, statistici } = await citesteTot()
      const pachet = {
        aplicatie: 'ȘANSA 2010 — Gestiune voluntari',
        creat_la: new Date().toISOString(),
        versiune: 1,
        tabele: date,
      }
      setPas('Se pregătește fișierul...')
      descarca(JSON.stringify(pachet, null, 2), `backup-sansa2010-${azi()}.json`, 'application/json')
      setRezultat(statistici)
    } catch (e) {
      setEroare('Nu s-a putut realiza backup-ul: ' + e.message)
    }
    setLucreaza(false); setPas('')
  }

  // Backup lizibil — un singur fisier CSV cu toate tabelele, deschis in Excel
  async function backupCSV() {
    setLucreaza(true); setEroare(''); setRezultat(null)
    try {
      const { date, statistici } = await citesteTot()
      setPas('Se pregătește fișierul...')
      let text = `BACKUP ASOCIATIA SANSA 2010 — ${new Date().toLocaleString('ro-RO')}\r\n\r\n`
      for (const t of TABELE) {
        const randuri = date[t.nume]
        text += `=== ${t.eticheta.toUpperCase()} (${randuri.length} înregistrări) ===\r\n`
        text += randuri.length ? tabelCSV(randuri) : '(gol)'
        text += '\r\n\r\n'
      }
      descarca('\uFEFF' + text, `backup-sansa2010-${azi()}.csv`, 'text/csv;charset=utf-8;')
      setRezultat(statistici)
    } catch (e) {
      setEroare('Nu s-a putut realiza backup-ul: ' + e.message)
    }
    setLucreaza(false); setPas('')
  }

  const totalInregistrari = rezultat ? rezultat.reduce((s, r) => s + r.nr, 0) : 0

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <Database size={17} style={{ color: '#1a6b4a' }} />
        <span className="card-title" style={{ marginBottom: 0 }}>Copie de siguranță</span>
      </div>
      <p className="text-sm text-gray-400 mb-5">
        Descarcă toate datele din aplicație într-un singur fișier. Recomandat lunar — planul gratuit nu include backup automat.
      </p>

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary gap-2" onClick={backupJSON} disabled={lucreaza}>
          <Download size={14} /> {lucreaza ? 'Se lucrează...' : 'Backup complet (JSON)'}
        </button>
        <button className="btn btn-outline gap-2" onClick={backupCSV} disabled={lucreaza}>
          <Download size={14} /> Backup lizibil (Excel)
        </button>
      </div>

      {pas && <p className="text-sm mt-4" style={{ color: '#1a6b4a' }}>{pas}</p>}

      {eroare && (
        <div className="flex items-start gap-2 mt-4 p-3 rounded-lg" style={{ background: '#fef2f2', color: '#991b1b' }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span className="text-sm">{eroare}</span>
        </div>
      )}

      {rezultat && (
        <div className="mt-5 p-4 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
            <span className="font-medium text-sm" style={{ color: '#166534' }}>
              Backup descărcat — {totalInregistrari} înregistrări salvate
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {rezultat.map(r => (
              <div key={r.nume} className="flex justify-between text-xs">
                <span className="text-gray-600">{r.eticheta}</span>
                <strong className={r.problema ? 'text-amber-600' : 'text-gray-700'}>
                  {r.problema ? 'inaccesibil' : r.nr}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Fișierul <strong>JSON</strong> conține toate datele exact ca în baza de date și poate fi folosit pentru restaurare.
        Fișierul <strong>Excel</strong> e destinat citirii și arhivării pe hârtie. Păstrează-le într-un loc sigur (Drive, stick, calculator).
      </p>
    </div>
  )
}
