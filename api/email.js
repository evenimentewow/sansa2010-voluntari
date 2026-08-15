// Serverless function Vercel — trimitere email prin Resend
// Necesita variabila de mediu RESEND_API_KEY in Vercel
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda nepermisa' })

  const cheie = process.env.RESEND_API_KEY
  if (!cheie) return res.status(200).json({ ok: false, motiv: 'neconfigurat' })

  const { catre, subiect, continut, expeditor } = req.body || {}
  if (!catre || !subiect) return res.status(400).json({ error: 'Lipsesc destinatarul sau subiectul' })

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cheie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: expeditor || 'Asociatia SANSA 2010 <onboarding@resend.dev>',
        to: Array.isArray(catre) ? catre : [catre],
        subject: subiect,
        html: continut,
      }),
    })
    const d = await r.json()
    if (!r.ok) return res.status(502).json({ ok: false, error: d.message || 'Trimitere esuata' })
    return res.status(200).json({ ok: true, id: d.id })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
