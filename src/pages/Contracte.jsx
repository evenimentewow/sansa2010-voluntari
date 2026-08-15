import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { FileText, Printer, Download, Share2, MessageCircle, Mail, Trash2 } from 'lucide-react'

const AN = new Date().getFullYear()
const serieCod = (p, a) => `${(p || 'VOL').toUpperCase()}${a || AN}`
const nrDoc = n => String(n || 0).padStart(3, '0')
const dataRo = d => new Date(d || Date.now()).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
const L = v => v || '__________'

export default function Contracte() {
  const { user } = useAuth()
  const esteAdmin = user?.rol === 'admin'

  const [voluntari, setVoluntari] = useState([])
  const [contracte, setContracte] = useState([])
  const [imputerniciti, setImputerniciti] = useState([])
  const [serie, setSerie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selId, setSelId] = useState('')
  const [semnatarId, setSemnatarId] = useState('')
  const [preview, setPreview] = useState(null)
  const [salvez, setSalvez] = useState(false)

  useEffect(() => { incarca() }, [])

  async function incarca() {
    const [v, c, i, s] = await Promise.all([
      supabase.from('voluntari').select('*').order('nume'),
      supabase.from('contracte').select('*, voluntari(nume)').order('created_at', { ascending: false }),
      supabase.from('imputerniciti').select('*').eq('activ', true).order('created_at'),
      supabase.from('serii').select('*').eq('tip', 'voluntariat').eq('an', AN).maybeSingle(),
    ])
    setVoluntari(v.data || []); setContracte(c.data || [])
    setImputerniciti(i.data || []); setSerie(s.data || null)
    if (!semnatarId && i.data?.length) setSemnatarId(i.data[0].id)
    setLoading(false)
  }

  async function genereaza() {
    if (!selId) return alert('Selectați voluntarul')
    if (!semnatarId) return alert('Selectați semnatarul din partea asociației')
    setSalvez(true)

    const v = voluntari.find(x => x.id === selId)
    const sem = imputerniciti.find(x => x.id === semnatarId)
    const { data: nrData } = await supabase.rpc('next_numar_voluntariat')
    const numar_int = Math.max(nrData || 1, serie?.numar_start || 1)

    const payload = {
      voluntar_id: v.id,
      numar: `${serieCod(serie?.prefix, AN)}/${nrDoc(numar_int)}`,
      numar_int,
      serie_prefix: serie?.prefix || 'VOL',
      serie_an: AN,
      semnatar_nume: sem?.nume || null,
      semnatar_functie: sem?.functie || null,
      status: 'generat',
      semnat_fizic: true,
    }

    const { data, error } = await supabase.from('contracte').insert(payload).select('*, voluntari(nume)').single()
    setSalvez(false)
    if (error) return alert('Eroare: ' + error.message)
    setPreview({ ...data, v })
    incarca()
    window.scrollTo(0, 0)
  }

  function deschide(c) {
    const v = voluntari.find(x => x.id === c.voluntar_id)
    setPreview({ ...c, v })
    window.scrollTo(0, 0)
  }

  async function sterge(c) {
    if (!confirm(`Ștergi contractul ${c.numar}?`)) return
    await supabase.from('contracte').delete().eq('id', c.id)
    if (preview?.id === c.id) setPreview(null)
    incarca()
  }

  const textShare = c => `CONTRACT DE VOLUNTARIAT ${c.numar} din ${dataRo(c.created_at)}
Voluntar: ${c.v?.nume || c.voluntari?.nume}
Asociația ȘANSA 2010, CIF 27772126
Reprezentant: ${c.semnatar_nume}`

  const shareWa = c => window.open(`https://wa.me/?text=${encodeURIComponent(textShare(c))}`, '_blank')
  const shareMail = c => { window.location.href = `mailto:${c.v?.email || ''}?subject=${encodeURIComponent(`Contract de voluntariat ${c.numar}`)}&body=${encodeURIComponent(textShare(c))}` }
  async function shareNativ(c) {
    if (navigator.share) { try { await navigator.share({ title: `Contract ${c.numar}`, text: textShare(c) }) } catch {} }
    else { await navigator.clipboard.writeText(textShare(c)); alert('Detaliile au fost copiate.') }
  }

  if (loading) return <><PageHeader title="Contracte de voluntariat" /><Spinner /></>

  const p = preview
  const v = p?.v

  return (
    <>
      <div className="no-print">
        <PageHeader title="Contracte de voluntariat"
          subtitle={`${contracte.length} contracte · seria ${serieCod(serie?.prefix, AN)}`} />
      </div>

      <div className="p-4 sm:p-8 space-y-6">

        {/* Generator */}
        <div className="card no-print">
          <div className="card-title">Generare contract</div>
          <p className="text-sm text-gray-400 mb-5">Datele voluntarului se preiau automat din fișa de înrolare</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Voluntar <span className="text-red-500">*</span></label>
              <select className="form-select" value={selId} onChange={e => setSelId(e.target.value)}>
                <option value="">— Selectează —</option>
                {voluntari.map(x => <option key={x.id} value={x.id}>{x.nume}{x.minor ? ' (minor)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Semnatar asociație <span className="text-red-500">*</span></label>
              <select className="form-select" value={semnatarId} onChange={e => setSemnatarId(e.target.value)}>
                <option value="">— Selectează —</option>
                {imputerniciti.map(i => <option key={i.id} value={i.id}>{i.nume} ({i.functie})</option>)}
              </select>
            </div>
          </div>
          {voluntari.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mt-3">
              Niciun voluntar înrolat. Folosiți secțiunea Înrolare sau linkul public.
            </p>
          )}
          <button className="btn btn-gold mt-4 gap-2" onClick={genereaza} disabled={salvez}>
            <FileText size={15} /> {salvez ? 'Se generează...' : 'Generează contractul'}
          </button>
        </div>

        {/* Document */}
        {p && v && (
          <div>
            <div className="no-print flex flex-wrap gap-2 mb-4">
              <button className="btn btn-primary gap-2" onClick={() => window.print()}><Download size={14} /> Salvează PDF</button>
              <button className="btn btn-outline gap-2" onClick={() => window.print()}><Printer size={14} /> Tipărește</button>
              <button className="btn btn-outline gap-2" onClick={() => shareWa(p)}><MessageCircle size={14} /> WhatsApp</button>
              <button className="btn btn-outline gap-2" onClick={() => shareMail(p)}><Mail size={14} /> E-mail</button>
              <button className="btn btn-outline gap-2" onClick={() => shareNativ(p)}><Share2 size={14} /> Distribuie</button>
              <button className="btn btn-outline" onClick={() => setPreview(null)}>✕ Închide</button>
            </div>

            <div id="print-area">
              <div className="doc-page">
                {/* Antet */}
                <div className="cv-antet">
                  <div className="cv-antet-st">
                    <strong>ASOCIAŢIA „ŞANSA 2010"</strong><br />
                    CIF 27772126<br />
                    Str. Grădiniţei, nr.22, bl. K4, et.4, ap.15<br />
                    loc. Paşcani, jud. Iaşi, cod 705200
                  </div>
                  <div className="cv-antet-dr">
                    Date de contact:<br />
                    asociatia.sansa2010@gmail.com<br />
                    tabaraimpreunapentrutineri@gmail.com<br />
                    tel: 0723 276029
                  </div>
                </div>

                <div className="doc-nr" style={{ marginTop: 10 }}>
                  Nr. <strong>{serieCod(p.serie_prefix, p.serie_an)}/{nrDoc(p.numar_int)}</strong> · {dataRo(p.created_at)}
                </div>

                <div className="doc-title">Contract de voluntariat</div>

                <p className="doc-art">I. Părţile</p>
                <p><strong>Art.1.</strong> Părţile prezentului contract sunt:</p>
                <p>a. Asociaţia „ŞANSA 2010", CIF 27772126, cu sediu în mun. Paşcani, Str. Grădiniţei, nr.22, bl. K4, et.4, ap.15, Tel: 0723 276029, Email: asociatia.sansa2010@gmail.com, reprezentată prin: <strong>{p.semnatar_nume}</strong>, în calitate de {p.semnatar_functie}, denumită în continuare <strong>Asociaţia</strong></p>
                <p>şi</p>
                <p>b. <strong>Voluntarul</strong></p>
                <p>Numele și prenumele <strong>{L(v.nume)}</strong>, CNP <strong>{L(v.cnp)}</strong>, domiciliat(ă) în localitatea: {L(v.localitate)}, adresa {L(v.adresa)}, tel {L(v.telefon)}, e-mail: {L(v.email)}, posesor(are) a(l) actului de identitate seria {L(v.ci_serie)}, nr. {L(v.ci_numar)}, eliberat de {L(v.ci_eliberat)}, la data de {v.ci_data_elib ? dataRo(v.ci_data_elib) : '__________'}, în calitate de voluntar, numit în continuare voluntar,</p>
                {v.minor && (
                  <>
                    <p>cu acordul părintelui/tutorelui/reprezentantului legal*</p>
                    <p>Numele și prenumele <strong>{L(v.parinte_nume)}</strong>, CNP {L(v.parinte_cnp)}, tel {L(v.parinte_telefon)}, posesor(are) a(l) actului de identitate seria {L(v.parinte_ci_serie)}, nr. {L(v.parinte_ci_numar)}, eliberat de {L(v.parinte_ci_elib)}, încheie prezentul contract de voluntariat.</p>
                  </>
                )}

                <p className="doc-art">II. Obiectul contractului</p>
                <p>2.1. Obiectul contractului îl constituie participarea la activităţile și proiectele Asociaţiei, în care este implicat voluntarul.</p>
                <p>2.2. În executarea contractului de voluntariat, voluntarul se subordonează coordonatorului proiectelor şi activităţilor Asociației şi reprezentantului acesteia, conform Art. 16 din Legea 78/2014 privind reglementarea activităţii de voluntariat din România.</p>

                <p className="doc-art">III. Durata contractului</p>
                <p><strong>Art. 3.</strong> Contractul este încheiat pentru o perioadă nedeterminată. Acesta poate fi reziliat de către Asociaţie pe baza unor motive întemeiate, care încalcă regulamentul de organizare sau care denaturează imaginea Asociaţiei.</p>

                <p className="doc-art">IV. Drepturile şi obligaţiile părţilor</p>
                <p><strong>Art. 4. Drepturile voluntarului:</strong></p>
                <ol className="cv-lista" type="a">
                  <li>Dreptul de a fi tratat ca şi coleg cu drepturi egale atât de către conducerea asociaţiei cât şi de către eventuali angajaţi;</li>
                  <li>Dreptul de a fi respectat ca persoană, fără deosebire de rasă, etnie, sex sau orientare sexuală, convingeri politice sau religioase, abilitate fizică/psihică, nivel de educaţie, stare civilă, situaţie economică sau orice alte asemenea criterii;</li>
                  <li>Dreptul de a avea acces la cât mai multe informaţii despre asociaţia în cadrul căreia urmează să activeze;</li>
                  <li>Dreptul de a se implica activ la elaborarea şi derularea programelor, proiectelor, la care urmează să participe;</li>
                  <li>Dreptul de a-şi desfăşura activitatea în concordanţă cu preferinţele personale, temperamentul, experienţa de viaţă, studiile şi experienţa profesională;</li>
                  <li>Dreptul de a participa la sesiuni de formare în domeniul în care prestează activitatea, atât la începutul activităţii cât şi pe parcurs;</li>
                  <li>Dreptul la supervizare — orientare din partea unei persoane cu experienţă, bine informată, cu răbdare, atentă şi care dispune de timp pentru a răspunde nevoilor sale;</li>
                  <li>Dreptul la un loc unde să îşi desfăşoare activitatea şi accesul la echipament şi consumabile necesare derulării activităţii, cu condiţia să aibă permisiune pentru folosirea acestora şi să le păstreze în bună stare;</li>
                  <li>Dreptul de a i se asigura protecţia muncii, în funcţie de natura şi caracteristicile activităţii desfăşurate;</li>
                  <li>Dreptul la o durată a timpului de lucru liber consimţită, care să nu îi afecteze sănătatea şi resursele psihofizice;</li>
                  <li>Dreptul de a i se elibera de către asociaţie un certificat nominal care să ateste calitatea de voluntar;</li>
                  <li>Dreptul de a fi promovat în conformitate cu rezultatele avute;</li>
                  <li>Dreptul de a beneficia de titluri onorifice, decoraţii şi premii, în funcţie de disponibilităţile financiare ale asociaţiei şi în condiţiile legii;</li>
                  <li>Dreptul de a se adresa în scris sau verbal conducerii asociației pentru a aduce la cunoştinţă obiecţiile, propunerile sau nemulţumirile spre analiză Consiliului Director;</li>
                  <li>Dreptul de a se adresa în scris Consiliului Director al Asociaţiei „ŞANSA 2010" în cazul unor abuzuri clare din partea altor voluntari, cu formularea explicită a acestor acuzaţii.</li>
                </ol>

                <p><strong>Art. 5.</strong> Aceste drepturi constituie obligaţiile Asociaţiei. Alte obligaţii ale Asociaţiei sunt: organizarea de întâlniri/ședințe de orientare a voluntarilor; punerea la dispoziţia voluntarului a unei fişe a postului clare (titlul postului, scopul şi durata, sarcinile de îndeplinit, programul de lucru, persoana căreia i se subordonează, modalităţile de raportare, accesul la echipamente); desemnarea unei persoane care să supervizeze activitatea voluntarului.</p>

                <p><strong>Art. 6. Obligaţiile voluntarului:</strong></p>
                <ol className="cv-lista" type="a">
                  <li>Să presteze o activitate de interes public, fără remuneraţie;</li>
                  <li>Să anunţe în timp util orice schimbare survenită în derularea programului, cu minim 48 de ore înainte, precizând indisponibilitatea temporară de a presta activitatea de voluntariat (inclusiv întârzieri, absenţe);</li>
                  <li>Să păstreze şi să protejeze confidenţialitatea informaţiilor la care are acces, pe perioada desfăşurării contractului şi pe o perioadă de 2 ani după încetarea acestuia;</li>
                  <li>Să îndeplinească la timpul stabilit de comun acord sarcinile primite din partea Asociaţiei;</li>
                  <li>Să aibă o conduită complementară cu obiectivele generale ale voluntariatului — îmbunătăţirea calităţii vieţii şi reducerea sărăciei, dezvoltare sustenabilă, sănătate, prevenirea şi gestionarea efectelor dezastrelor, incluziunea socială;</li>
                  <li>Să nu comunice sau să răspândească în public afirmaţii defăimătoare la adresa organizaţiei şi/sau a activităţii şi conducerii acesteia;</li>
                  <li>Să participe la cursurile de instruire organizate, iniţiate sau propuse de către Asociaţie;</li>
                  <li>Să fie la curent cu misiunea şi activităţile Asociaţiei;</li>
                  <li>Să respecte procedurile, politicile şi regulamentele interne ale Asociaţiei;</li>
                  <li>Să ocrotească şi să păstreze în stare corespunzătoare mobilierul, aparatura şi celelalte bunuri şi materiale necesare bunei desfăşurări a activităţilor, deteriorarea acestora ducând la achitarea contravalorii sau înlocuirea lor;</li>
                  <li>Să ofere servicii de calitate sau să solicite sprijin persoanei căreia i se subordonează, în situaţiile în care desfăşoară activităţi într-un domeniu necunoscut;</li>
                  <li>Să completeze corect şi la timp toate formularele sau rapoartele solicitate;</li>
                  <li>Să trate cu respect toate persoanele cu care vine în contact şi să îşi ofere serviciile cu respect pentru fiinţa umană şi pentru mediul înconjurător, fără a discrimina;</li>
                  <li>Să aducă în discuţie cu persoana căreia i se subordonează direct toate situaţiile în care ar putea apărea conflicte de interese;</li>
                  <li>Să ajute beneficiarii implicaţi în activităţi şi proiecte.</li>
                </ol>

                <p><strong>Art. 7. Drepturile Asociaţiei:</strong> dreptul de a stabili organizarea şi funcţionarea activităţii de voluntariat; de a iniţia conţinutul fişei de voluntariat; de a exercita controlul asupra modului de implementare a fişei de voluntariat; de a constata abaterile voluntarului; de a solicita documente sau certificate de sănătate necesare desfășurării activităților; de a condiţiona participarea la activităţi prin asumarea unui angajament scris; de a utiliza datele personale ale voluntarului pentru îndeplinirea formalităților organizatorice și întocmirea materialelor foto/video din timpul activităţilor, exclusiv în scopul promovării proiectelor Asociaţiei şi al rapoartelor către instituţii publice şi private; de a pretinde şi încasa taxe şi cotizaţii necesare desfăşurării activităţilor.</p>

                <p className="doc-art">V. Perioada de probă</p>
                <p><strong>Art. 8.</strong> 8.1. Prezentul contract este supus unei perioade de probă pe o durată de 30 de zile de la încheierea sa. 8.2. În perioada de probă, părţile pot denunţa contractul cu preaviz de 15 zile.</p>

                <p className="doc-art">VI. Răspunderea, renegocierea, rezilierea şi litigiile</p>
                <p><strong>Art. 9.</strong> Răspunderea pentru neexecutarea sau pentru executarea necorespunzătoare a contractului de voluntariat este supusă regulilor prevăzute de Codul Civil.</p>
                <p><strong>Art. 10.</strong> Renegocierea contractului se face în cazul apariţiei unei situaţii de natură să îngreuneze executarea obligaţiilor care revin voluntarului, la cererea scrisă a oricărei părţi, formulată în termen de 15 zile de la apariţia situaţiei.</p>
                <p><strong>Art. 11.</strong> În cazul în care situaţia descrisă la articolul 10 face imposibilă executarea în continuare a contractului, acesta va fi reziliat de drept.</p>
                <p><strong>Art. 12.</strong> Denunţarea unilaterală a contractului are loc din iniţiativa voluntarului sau a Asociaţiei cu un preaviz de 15 zile. Asociaţia poate denunța unilateral contractul imediat ce voluntarul a încălcat prevederile acestuia sau orice alte restricţii legale, inclusiv în caz de necinste, incompetenţă sau condamnare pentru infracţiune. Contractul poate înceta şi prin acordul părţilor.</p>
                <p><strong>Art. 13.</strong> Litigiile izvorâte din încheierea, modificarea, executarea sau încetarea contractului sunt de competenţa instanţelor judecătoreşti, dacă părţile nu le pot rezolva pe cale amiabilă; acţiunile izvorâte din contractul de voluntariat sunt scutite de taxă de timbru.</p>
                <p><strong>Art. 14.</strong> Răspunderea pentru neexecutarea sau executarea necorespunzătoare a contractului este supusă prevederilor Legii nr. 287/2009 privind Codul civil, republicată.</p>

                <p className="doc-art">VII. Clauze finale</p>
                <p>15.1 Prezentul contract este însoțit de anexe (fișa de voluntariat și fișa de protecție a muncii), care fac parte integrantă din acest contract.</p>
                <p>15.2 Prezentul contract se va încheia cu acordul părinţilor sau al reprezentanţilor legali, conform legislaţiei în vigoare.</p>
                <p>15.3 Răspunderea pentru neexecutarea sau executarea necorespunzătoare a contractului este supusă prevederilor Legii nr. 287/2009 privind Codul civil, republicată.</p>
                <p>15.4 Toate prevederile prezentului Contract sunt rezultatul negocierii dintre Asociație și Voluntar şi reprezintă acordul total al părților, iar Voluntarul declară în mod expres că a citit, a înțeles și a acceptat prevederile lui, primind un exemplar al acestuia.</p>
                <p>15.5 Prezentului Contract îi sunt aplicabile dispozițiile legii române.</p>

                <p style={{ marginTop: 14 }}>Încheiat astăzi, <strong>{dataRo(p.created_at)}</strong>, în două exemplare, câte unul pentru fiecare parte, şi intră în vigoare la data semnării de către ambele părți.</p>

                <div className="cv-semnaturi">
                  <div>
                    <strong>Voluntarul{v.minor ? '*' : ''}</strong><br />{v.nume}
                    <div className="line">(semnătura)</div>
                  </div>
                  <div>
                    {v.minor ? (
                      <>
                        <strong>Părinte/Tutore*</strong><br />{v.parinte_nume || '__________'}
                        <div className="line">(semnătura)</div>
                      </>
                    ) : <span style={{ opacity: 0 }}>—</span>}
                  </div>
                  <div>
                    <strong>Asociaţia „ŞANSA 2010"</strong><br />
                    {p.semnatar_nume}<br />
                    <span style={{ fontSize: '9.5pt' }}>{p.semnatar_functie}</span>
                    <div className="stamp-wrap"><img src="/stampila.png" alt="" className="stamp-img" /></div>
                    <div className="line">(semnătura şi ştampila)</div>
                  </div>
                </div>
                <p style={{ fontSize: '9pt', marginTop: 12, color: '#555' }}>
                  *) Dacă voluntarul este major nu mai este solicitată semnătura părintelui/tutorelui acestuia.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Registru */}
        <div className="card no-print">
          <div className="card-title">Contracte emise</div>
          {contracte.length === 0
            ? <EmptyState icon="📄" title="Niciun contract emis" subtitle="Selectați un voluntar și generați primul contract." />
            : (
              <div className="overflow-x-auto mt-3">
                <table className="tbl" style={{ minWidth: 620 }}>
                  <thead><tr><th>Număr</th><th>Data</th><th>Voluntar</th><th>Semnatar</th><th></th></tr></thead>
                  <tbody>
                    {contracte.map(c => (
                      <tr key={c.id}>
                        <td className="text-sm"><strong>{c.numar}</strong></td>
                        <td className="text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString('ro-RO')}</td>
                        <td className="text-sm font-medium">{c.voluntari?.nume}</td>
                        <td className="text-xs text-gray-500">{c.semnatar_nume}</td>
                        <td>
                          <div className="flex gap-1.5">
                            <button className="btn btn-outline btn-sm" onClick={() => deschide(c)}>Deschide</button>
                            {esteAdmin && <button className="btn btn-danger btn-sm" onClick={() => sterge(c)}><Trash2 size={12} /></button>}
                          </div>
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
