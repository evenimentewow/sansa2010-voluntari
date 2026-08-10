// Serverless function Vercel — interogare ANAF dupa CUI
// Apel: /api/anaf?cui=12345678
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const raw = String(req.query.cui || '')
  const cui = parseInt(raw.replace(/[^0-9]/g, ''), 10)
  if (!cui) return res.status(400).json({ error: 'CUI invalid' })

  const azi = new Date().toISOString().slice(0, 10)

  try {
    const r = await fetch('https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify([{ cui, data: azi }]),
    })

    if (!r.ok) return res.status(502).json({ error: `ANAF a raspuns cu ${r.status}` })
    const j = await r.json()

    const found = j?.found?.[0]
    if (!found) return res.status(404).json({ error: 'CUI negasit in evidentele ANAF' })

    const g = found.date_generale || {}
    const adr = found.adresa_sediu_social || {}

    const adresa = [
      adr.sdenumire_Strada && `${adr.sdenumire_Strada} ${adr.snumar_Strada || ''}`.trim(),
      adr.sdenumire_Localitate,
      adr.sdenumire_Judet,
    ].filter(Boolean).join(', ')

    return res.status(200).json({
      cui: g.cui ? `RO${g.cui}` : raw,
      denumire: g.denumire || '',
      adresa: adresa || g.adresa || '',
      nrRegCom: g.nrRegCom || '',
      telefon: g.telefon || '',
      stare: g.stare_inregistrare || '',
      platitorTva: !!(found.inregistrare_scop_Tva?.scpTVA),
    })
  } catch (e) {
    return res.status(500).json({ error: 'Eroare la interogarea ANAF: ' + e.message })
  }
}
