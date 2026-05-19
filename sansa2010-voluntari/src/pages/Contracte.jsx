import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, SectionTitle, Spinner, EmptyState } from '../components/ui'
import { FileText } from 'lucide-react'

export default function Contracte() {
  const [voluntari, setVoluntari] = useState([])
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState('')
  const [nrContract, setNrContract] = useState('')
  const [preview, setPreview] = useState(null)
  const [sigMode, setSigMode] = useState('draw')
  const [contracte, setContracte] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('voluntari').select('id,nume,cnp,localitate,adresa,telefon,email,ci_serie,ci_numar,ci_eliberat,ci_data_elib,minor,parinte_nume,parinte_cnp').order('nume'),
      supabase.from('contracte').select('*,voluntari(nume)').order('created_at', { ascending: false }),
    ]).then(([{ data: v }, { data: c }]) => {
      setVoluntari(v || [])
      setContracte(c || [])
      setLoading(false)
    })
  }, [])

  function genereaza() {
    if (!selId) { alert('Selectează un voluntar'); return }
    const v = voluntari.find(x => x.id === selId)
    setPreview(v)
  }

  async function salveazaContract() {
    if (!preview) return
    const { error } = await supabase.from('contracte').insert({
      voluntar_id: preview.id,
      numar: nrContract || null,
      semnat_digital: sigMode === 'draw',
      semnat_fizic: sigMode === 'print',
      status: 'generat',
    })
    if (error) { alert('Eroare: ' + error.message); return }
    alert('✅ Contract salvat în baza de date!')
    setPreview(null)
    const { data: c } = await supabase.from('contracte').select('*,voluntari(nume)').order('created_at', { ascending: false })
    setContracte(c || [])
  }

  const azi = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })

  if (loading) return <><PageHeader title="Contracte" /><Spinner /></>

  return (
    <>
      <PageHeader title="Contracte" subtitle="Generare și gestionare contracte de voluntariat" />
      <div className="p-8 space-y-6">

        {/* Generator */}
        <div className="card">
          <div className="card-title">Generare contract rapid</div>
          <p className="text-sm text-gray-400 mb-5">Selectează un voluntar pentru a genera contractul completat automat</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Voluntar</label>
              <select className="form-select" value={selId} onChange={e => { setSelId(e.target.value); setPreview(null) }}>
                <option value="">— Selectează —</option>
                {voluntari.map(v => <option key={v.id} value={v.id}>{v.nume}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Număr contract</label>
              <input className="form-input" value={nrContract} onChange={e => setNrContract(e.target.value)} placeholder="Ex: 12/2025" />
            </div>
          </div>
          <button className="btn btn-gold mt-4 gap-2" onClick={genereaza}>
            <FileText size={15} /> Previzualizează și generează
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="card">
            <div className="card-title">Contract generat — {preview.nume}</div>
            <p className="text-sm text-gray-400 mb-5">Nr. {nrContract || '—'} din {azi}</p>

            <div className="rounded-xl border p-6 text-sm leading-relaxed mb-6" style={{ background: '#fffef7', borderColor: '#e8dfa0', fontFamily: 'DM Serif Display, serif' }}>
              <p className="text-right text-xs opacity-60">asociatia.sansa2010@gmail.com · 0723 276029</p>
              <p className="text-center mt-3 font-bold text-base">ASOCIAȚIA "ȘANSA 2010"</p>
              <p className="text-center text-xs opacity-60">CIF 27772126 · Str. Grădiniței 22, bl.K4, et.4, ap.15, Pașcani, Iași</p>
              <p className="text-center mt-4 text-xs opacity-50">Nr. {nrContract || '_____'} / {azi}</p>
              <p className="text-center mt-3 font-bold text-lg">Contract de voluntariat</p>

              <p className="mt-5"><strong>I. Părțile</strong></p>
              <p className="mt-2">a. Asociația "ȘANSA 2010", CIF 27772126, cu sediu în mun. Pașcani, Str. Grădiniței, nr.22, bl. K4, et.4, ap.15, Tel: 0723 276029, Email: asociatia.sansa2010@gmail.com, reprezentată prin <strong>Spiridon Mihaela-Iulia</strong>, în calitate de președinte, denumită în continuare Asociația</p>
              <p className="mt-2">și</p>
              <p className="mt-2">b. <strong>Voluntarul:</strong> {preview.nume}, CNP <span className="bg-yellow-100 px-1 rounded font-mono">{preview.cnp}</span>, domiciliat(ă) în localitatea: <span className="bg-yellow-100 px-1 rounded">{preview.localitate}</span>, adresa <span className="bg-yellow-100 px-1 rounded">{preview.adresa || '—'}</span>, tel <span className="bg-yellow-100 px-1 rounded">{preview.telefon}</span>, e-mail: <span className="bg-yellow-100 px-1 rounded">{preview.email}</span>, posesor(are) a(l) actului de identitate seria <span className="bg-yellow-100 px-1 rounded">{preview.ci_serie}</span>, nr. <span className="bg-yellow-100 px-1 rounded">{preview.ci_numar}</span>, eliberat de <span className="bg-yellow-100 px-1 rounded">{preview.ci_eliberat}</span>, la data de <span className="bg-yellow-100 px-1 rounded">{preview.ci_data_elib || '—'}</span>, în calitate de voluntar.</p>
              {preview.minor && preview.parinte_nume && (
                <p className="mt-2">cu acordul părintelui/tutorelui: <span className="bg-yellow-100 px-1 rounded">{preview.parinte_nume}</span>, CNP <span className="bg-yellow-100 px-1 rounded font-mono">{preview.parinte_cnp}</span></p>
              )}

              <p className="mt-4 text-xs opacity-50">... [II. Obiectul contractului — III. Durata — IV. Drepturile și obligațiile părților — V. Perioada de probă — VI. Răspundere și litigii — VII. Clauze finale — conform Legii 78/2014] ...</p>

              <p className="mt-4">Încheiat astăzi, <strong>{azi}</strong>, în două exemplare, câte unul pentru fiecare parte, și intră în vigoare la data semnării de către ambele părți.</p>

              <div className="grid grid-cols-3 gap-4 mt-6 text-center text-xs">
                <div>
                  <strong>Voluntarul{preview.minor ? '*' : ''}</strong><br />
                  {preview.nume}<br /><br />
                  ___________________<br />
                  (semnătura)
                </div>
                <div>
                  {preview.minor ? <><strong>Părinte/Tutore*</strong><br />___________________<br /><br />___________________<br />(semnătura)</> : <span className="opacity-0">—</span>}
                </div>
                <div>
                  <strong>Asociația "ȘANSA 2010"</strong><br />
                  Spiridon Mihaela Iulia<br /><br />
                  ___________________<br />
                  (semnătura și ștampila)
                </div>
              </div>
              {preview.minor && <p className="mt-3 text-xs opacity-60">*) Dacă voluntarul este major nu mai este solicitată semnătura părintelui/tutorelui.</p>}
            </div>

            <SectionTitle>Mod semnătură</SectionTitle>
            <div className="flex gap-3 mb-4">
              <button onClick={() => setSigMode('draw')} className={`btn btn-sm ${sigMode === 'draw' ? 'btn-primary' : 'btn-outline'}`}>✏️ Semnătură digitală</button>
              <button onClick={() => setSigMode('print')} className={`btn btn-sm ${sigMode === 'print' ? 'btn-primary' : 'btn-outline'}`}>🖨️ Tipărire fizică</button>
            </div>

            <div className="flex gap-3">
              <button className="btn btn-primary gap-2" onClick={salveazaContract}><FileText size={14} /> Salvează în sistem</button>
              <button className="btn btn-outline" onClick={() => alert('📄 PDF descărcat!')}>⬇ Descarcă PDF</button>
              <button className="btn btn-outline" onClick={() => alert('🖨️ Tipărire...')}>🖨️ Tipărește</button>
            </div>
          </div>
        )}

        {/* Contracte emise */}
        <div className="card">
          <div className="card-title">Contracte emise</div>
          {contracte.length === 0
            ? <EmptyState icon="📄" title="Niciun contract emis" subtitle="Generează primul contract folosind formularul de mai sus." />
            : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-2">
                <table className="tbl">
                  <thead><tr><th>Voluntar</th><th>Număr</th><th>Data</th><th>Tip semnătură</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {contracte.map(c => (
                      <tr key={c.id}>
                        <td className="font-medium text-sm">{c.voluntari?.nume}</td>
                        <td className="text-sm text-gray-500">{c.numar || '—'}</td>
                        <td className="text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString('ro-RO')}</td>
                        <td className="text-xs text-gray-500">{c.semnat_digital ? '✏️ Digital' : '🖨️ Fizic'}</td>
                        <td><span className={`badge ${c.status === 'semnat' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span></td>
                        <td><button className="btn btn-outline btn-sm" onClick={() => alert('📄 Contract descărcat!')}>⬇ PDF</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>
    </>
  )
}
