import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { FileText, Printer, Plus } from 'lucide-react'

const ASOCIATIE = {
  denumire: 'ASOCIATIA SANSA 2010',
  cod_fiscal: '27772126',
  reg: 'nr. 32/PJ/2010, Judecatoria Pascani',
  sediu: 'Pascani, str. Gradinitei, nr. 22, bl. K4, ap.15, cod postal 705200',
  cont: 'RO58RNCB0176160764990001',
  banca: 'BCR Agentia Pascani',
  reprezentant: 'Spiridon Mihaela Iulia',
  calitate: 'presedinte',
}

function suma_in_litere(n) {
  // Simplificat - afișează suma numeric formatat
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2 }).format(n)
}

export default function Sponsorizari() {
  const { user } = useAuth()
  const isGuest = user?.rol === 'guest'
  const [sponsorizari, setSponsorizari] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState({
    sponsor_denumire: '', sponsor_sediu: '', sponsor_reg_com: '', sponsor_cui: '',
    sponsor_cont: '', sponsor_banca: '', sponsor_reprezentant: '',
    sponsor_ci_serie: '', sponsor_ci_numar: '', sponsor_cnp: '', sponsor_calitate: 'administrator',
    suma: '', data_limita: '', are_chitanta: false,
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase.from('sponsorizari').select('*').order('numar', { ascending: false })
    setSponsorizari(data || [])
    setLoading(false)
  }

  function upd(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function salveaza() {
    if (!form.sponsor_denumire || !form.suma) {
      alert('Completați cel puțin denumirea sponsorului și suma'); return
    }
    setSaving(true)

    // Obține numărul următor de contract
    const { data: nrData } = await supabase.rpc('next_numar_sponsorizare')
    const numar = nrData || 1

    let chitanta_numar = null
    if (form.are_chitanta) {
      const { data: chData } = await supabase.rpc('next_numar_chitanta')
      chitanta_numar = chData || 1
    }

    const payload = {
      numar,
      sponsor_denumire: form.sponsor_denumire,
      sponsor_sediu: form.sponsor_sediu,
      sponsor_reg_com: form.sponsor_reg_com,
      sponsor_cui: form.sponsor_cui,
      sponsor_cont: form.sponsor_cont,
      sponsor_banca: form.sponsor_banca,
      sponsor_reprezentant: form.sponsor_reprezentant,
      sponsor_ci_serie: form.sponsor_ci_serie,
      sponsor_ci_numar: form.sponsor_ci_numar,
      sponsor_cnp: form.sponsor_cnp,
      sponsor_calitate: form.sponsor_calitate,
      suma: parseFloat(form.suma),
      data_limita: form.data_limita || null,
      are_chitanta: form.are_chitanta,
      chitanta_numar,
      chitanta_data: form.are_chitanta ? new Date().toISOString().slice(0, 10) : null,
      introdus_de: user?.email || 'guest',
    }

    const { data, error } = await supabase.from('sponsorizari').insert(payload).select().single()
    if (error) { alert('Eroare: ' + error.message); setSaving(false); return }

    setShowForm(false)
    setSaving(false)
    setForm({
      sponsor_denumire: '', sponsor_sediu: '', sponsor_reg_com: '', sponsor_cui: '',
      sponsor_cont: '', sponsor_banca: '', sponsor_reprezentant: '',
      sponsor_ci_serie: '', sponsor_ci_numar: '', sponsor_cnp: '', sponsor_calitate: 'administrator',
      suma: '', data_limita: '', are_chitanta: false,
    })
    fetchAll()
    setPreview(data)
  }

  const azi = (d) => new Date(d || Date.now()).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })

  if (loading) return <><PageHeader title="Sponsorizări" /><Spinner /></>

  return (
    <>
      <PageHeader
        title="Contracte de sponsorizare"
        subtitle={`${sponsorizari.length} contracte emise`}
        actions={
          <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Contract nou
          </button>
        }
      />

      <div className="p-4 sm:p-8 space-y-6">

        {/* Formular contract nou */}
        {showForm && (
          <div className="card">
            <div className="card-title">Contract de sponsorizare nou</div>
            <p className="text-sm text-gray-400 mb-5">Numărul contractului se generează automat (consecutiv)</p>

            <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mb-4">Date sponsor (firma)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Denumire firmă <span className="text-red-500">*</span></label>
                <input className="form-input" value={form.sponsor_denumire} onChange={e => upd('sponsor_denumire', e.target.value)} placeholder="Ex: SC EXEMPLU SRL" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Sediul</label>
                <input className="form-input" value={form.sponsor_sediu} onChange={e => upd('sponsor_sediu', e.target.value)} placeholder="Adresa completă a firmei" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Nr. Registrul Comerțului</label>
                <input className="form-input" value={form.sponsor_reg_com} onChange={e => upd('sponsor_reg_com', e.target.value)} placeholder="Ex: J22/123/2020" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">CUI</label>
                <input className="form-input" value={form.sponsor_cui} onChange={e => upd('sponsor_cui', e.target.value)} placeholder="Ex: RO12345678" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Cont bancar (IBAN)</label>
                <input className="form-input" value={form.sponsor_cont} onChange={e => upd('sponsor_cont', e.target.value)} placeholder="RO..." />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Banca</label>
                <input className="form-input" value={form.sponsor_banca} onChange={e => upd('sponsor_banca', e.target.value)} placeholder="Ex: BCR Pașcani" />
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mb-4 mt-6">Reprezentant legal</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Nume și prenume</label>
                <input className="form-input" value={form.sponsor_reprezentant} onChange={e => upd('sponsor_reprezentant', e.target.value)} placeholder="Numele reprezentantului" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Calitate</label>
                <input className="form-input" value={form.sponsor_calitate} onChange={e => upd('sponsor_calitate', e.target.value)} placeholder="Ex: administrator" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">CI Seria</label>
                  <input className="form-input" maxLength={2} value={form.sponsor_ci_serie} onChange={e => upd('sponsor_ci_serie', e.target.value.toUpperCase())} placeholder="IS" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">CI Număr</label>
                  <input className="form-input" value={form.sponsor_ci_numar} onChange={e => upd('sponsor_ci_numar', e.target.value)} placeholder="123456" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">CNP</label>
                <input className="form-input font-mono" maxLength={13} value={form.sponsor_cnp} onChange={e => upd('sponsor_cnp', e.target.value)} placeholder="13 cifre" />
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-widest text-green-700 border-b-2 border-green-100 pb-1.5 mb-4 mt-6">Detalii sponsorizare</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Suma (RON) <span className="text-red-500">*</span></label>
                <input className="form-input" type="number" step="0.01" value={form.suma} onChange={e => upd('suma', e.target.value)} placeholder="Ex: 1000" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Data limită de plată</label>
                <input className="form-input" type="date" value={form.data_limita} onChange={e => upd('data_limita', e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 mt-4 rounded-lg border-2 cursor-pointer transition-all"
              style={{ borderColor: form.are_chitanta ? '#c8a84b' : '#e5e7eb', background: form.are_chitanta ? '#fdf6e3' : '#fff' }}>
              <input type="checkbox" className="w-5 h-5" style={{ accentColor: '#c8a84b' }}
                checked={form.are_chitanta} onChange={e => upd('are_chitanta', e.target.checked)} />
              <div>
                <div className="font-medium text-sm">🧾 Emite și chitanță</div>
                <div className="text-xs text-gray-500">Chitanța va fi inseriată automat (n+1) și va prelua suma din contract</div>
              </div>
            </label>

            <div className="flex gap-3 mt-6">
              <button className="btn btn-outline flex-1 justify-center" onClick={() => setShowForm(false)}>Anulează</button>
              <button className="btn btn-primary flex-1 justify-center" onClick={salveaza} disabled={saving}>
                {saving ? '⏳ Se generează...' : '✓ Generează contractul'}
              </button>
            </div>
          </div>
        )}

        {/* Preview contract generat */}
        {preview && (
          <div className="card" style={{ borderColor: '#c8a84b', borderWidth: 2 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="card-title">✅ Contract nr. {preview.numar} generat</div>
                <p className="text-sm text-gray-400">{preview.sponsor_denumire} · {suma_in_litere(preview.suma)} RON</p>
              </div>
              <button className="text-gray-400 text-xl" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setPreview(null)}>✕</button>
            </div>

            <div className="rounded-xl border p-4 sm:p-6 text-xs sm:text-sm leading-relaxed" style={{ background: '#fffef7', borderColor: '#e8dfa0', fontFamily: 'Georgia, serif' }} id="contract-print">
              <p className="text-right">Nr. <strong>{preview.numar}</strong> / {azi(preview.data_contract)}</p>
              <p className="text-center font-bold text-base sm:text-lg my-4">CONTRACT DE SPONSORIZARE</p>
              <p><strong>{preview.sponsor_denumire}</strong>, cu sediul în {preview.sponsor_sediu || '—'}, înregistrată la Registrul Comerțului sub nr. {preview.sponsor_reg_com || '—'}, cod unic de înregistrare {preview.sponsor_cui || '—'}, având contul nr. {preview.sponsor_cont || '—'} deschis la {preview.sponsor_banca || '—'}, reprezentată de către {preview.sponsor_reprezentant || '—'}, legitimat cu CI seria {preview.sponsor_ci_serie || '—'}, nr {preview.sponsor_ci_numar || '—'}, CNP {preview.sponsor_cnp || '—'}, în calitate de {preview.sponsor_calitate || '—'}</p>
              <p className="mt-1">— denumită în continuare <strong>Sponsor</strong>, și</p>
              <p className="mt-2"><strong>ASOCIATIA SANSA 2010</strong>, cod fiscal 27772126, înregistrată în Registrul Asociațiilor și Fundațiilor Judecătoria Pașcani cu nr. 32/PJ/2010, sediul în Pașcani, str. Grădiniței, nr. 22, bl. K4, ap.15, cod poștal 705200, contul nr. RO58RNCB0176160764990001, deschis la BCR Agenția Pașcani, reprezentată legal prin d-na Spiridon Mihaela Iulia, în calitate de președinte;</p>
              <p className="mt-1">— denumit în continuare <strong>Beneficiar</strong></p>
              <p className="mt-3"><strong>Art. 1. Obiectul Contractului</strong><br/>Obiectul prezentului contract îl constituie sponsorizarea activităților de voluntariat.</p>
              <p className="mt-2"><strong>Art. 2. Obligațiile Sponsorului</strong><br/>Sponsorul se obligă să predea până la data de <strong>{preview.data_limita ? azi(preview.data_limita) : '—'}</strong> suma de <strong>{suma_in_litere(preview.suma)} RON</strong>.</p>
              <p className="mt-2"><strong>Art. 3. Obligațiile Beneficiarului</strong><br/>Beneficiarul se obligă să utilizeze resursele financiare în scopul enunțat la Art. 1, în condițiile Legii nr. 32/1994.</p>
              <p className="mt-2 text-gray-500 text-xs">[Art. 4-5: Durata contractului 30 zile, dispoziții finale conform template]</p>
              <p className="mt-3">Prezentul contract a fost încheiat astăzi, <strong>{azi(preview.data_contract)}</strong>, în două (2) exemplare originale, în limba română.</p>
              <div className="grid grid-cols-2 gap-4 mt-6 text-center">
                <div><strong>Sponsor,</strong><br/>{preview.sponsor_denumire}<br/>{preview.sponsor_reprezentant}<br/><br/>___________________</div>
                <div><strong>Beneficiar,</strong><br/>ASOCIATIA SANSA 2010<br/>SPIRIDON MIHAELA<br/>Președinte<br/>___________________</div>
              </div>
            </div>

            {preview.are_chitanta && (
              <div className="rounded-xl border-2 border-dashed p-4 sm:p-6 mt-4 text-sm" style={{ background: '#fdf6e3', borderColor: '#c8a84b' }}>
                <p className="text-center font-bold mb-3">CHITANȚA Nr. {preview.chitanta_numar} / {azi(preview.chitanta_data)}</p>
                <p>Am primit de la <strong>{preview.sponsor_denumire}</strong> (CUI {preview.sponsor_cui || '—'})</p>
                <p>suma de <strong>{suma_in_litere(preview.suma)} RON</strong></p>
                <p>reprezentând: sponsorizare conform contract nr. {preview.numar} din {azi(preview.data_contract)}</p>
                <p className="mt-4 text-right">Casier / Președinte,<br/>Spiridon Mihaela Iulia<br/>___________________</p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button className="btn btn-primary gap-2" onClick={() => window.print()}>
                <Printer size={14} /> Tipărește
              </button>
            </div>
          </div>
        )}

        {/* Lista contracte */}
        <div className="card">
          <div className="card-title">Registru sponsorizări</div>
          {sponsorizari.length === 0
            ? <EmptyState icon="📄" title="Niciun contract emis" subtitle="Apasă 'Contract nou' pentru a genera primul contract de sponsorizare." />
            : (
              <div className="overflow-x-auto mt-2">
                <table className="tbl" style={{ minWidth: 600 }}>
                  <thead><tr><th>Nr.</th><th>Data</th><th>Sponsor</th><th>Suma</th><th>Chitanță</th><th></th></tr></thead>
                  <tbody>
                    {sponsorizari.map(s => (
                      <tr key={s.id}>
                        <td className="font-bold">#{s.numar}</td>
                        <td className="text-sm text-gray-500">{new Date(s.data_contract).toLocaleDateString('ro-RO')}</td>
                        <td className="font-medium text-sm">{s.sponsor_denumire}</td>
                        <td className="font-semibold">{suma_in_litere(s.suma)} RON</td>
                        <td>
                          {s.are_chitanta
                            ? <Badge variant="gold">🧾 Nr. {s.chitanta_numar}</Badge>
                            : <Badge variant="gray">—</Badge>}
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => setPreview(s)}>Vezi</button>
                        </td>
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
