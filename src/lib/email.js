// src/lib/email.js — trimitere notificari din aplicatie
import { supabase } from './supabase'

const ANTET = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto">
    <div style="background:#1a6b4a;color:#fff;padding:22px 24px;border-radius:12px 12px 0 0">
      <div style="font-size:19px;font-weight:bold">Asociația ȘANSA 2010</div>
      <div style="font-size:12px;opacity:.75;margin-top:3px">CIF 27772126 · Pașcani, jud. Iași</div>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;color:#1a1f1c;font-size:14px;line-height:1.6">
`
const SUBSOL = `
    </div>
    <div style="text-align:center;font-size:11px;color:#9aa5a0;padding:14px">
      asociatia.sansa2010@gmail.com · 0723 276029
    </div>
  </div>
`

async function trimite({ catre, subiect, corp, tip }) {
  if (!catre) return { ok: false, motiv: 'fara destinatar' }
  try {
    const r = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catre, subiect, continut: ANTET + corp + SUBSOL }),
    })
    const d = await r.json()
    await supabase.from('notificari').insert({
      tip, destinatar: catre, subiect,
      status: d.ok ? 'trimis' : 'esuat',
      detalii: d.ok ? null : (d.error || d.motiv || 'necunoscut'),
    })
    return d
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// Confirmare catre voluntarul nou inrolat
export function emailInrolare(v) {
  return trimite({
    catre: v.email, tip: 'inrolare',
    subiect: 'Înrolare confirmată — Asociația ȘANSA 2010',
    corp: `
      <p>Bună, <strong>${v.nume}</strong>,</p>
      <p>Îți confirmăm că înrolarea ta ca voluntar a fost înregistrată cu succes.</p>
      <p>Datele tale au ajuns la echipa asociației, iar un coordonator te va contacta în curând
      pentru a stabili detaliile participării la activități.</p>
      ${v.rol_dorit?.length ? `<p><strong>Roluri alese:</strong> ${v.rol_dorit.join(', ')}</p>` : ''}
      <p style="margin-top:20px">Îți mulțumim că vrei să faci parte din echipa noastră.</p>
      <p style="color:#6b7c74">Echipa Asociației ȘANSA 2010</p>
    `,
  })
}

// Anunt catre echipa asociatiei
export function emailEchipaInrolare(v, catre) {
  return trimite({
    catre, tip: 'inrolare',
    subiect: `Voluntar nou înrolat: ${v.nume}`,
    corp: `
      <p>Un voluntar nou s-a înrolat prin formularul public.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">
        <tr><td style="padding:6px 0;color:#6b7c74;width:130px">Nume</td><td><strong>${v.nume}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b7c74">Localitate</td><td>${v.localitate || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7c74">Instituție</td><td>${v.institutie || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7c74">Telefon</td><td>${v.telefon || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7c74">E-mail</td><td>${v.email || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7c74">Vârstă</td><td>${v.minor ? 'minor — necesită acordul părintelui' : 'major'}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7c74">Roluri dorite</td><td>${(v.rol_dorit || []).join(', ') || '—'}</td></tr>
      </table>
      <p style="margin-top:16px">Fișa completă este disponibilă în aplicație, la secțiunea Voluntari.</p>
    `,
  })
}

// Anunt de activitate catre voluntari
export function emailActivitate(activitate, destinatari) {
  return trimite({
    catre: destinatari, tip: 'activitate',
    subiect: `Activitate: ${activitate.nume} — ${new Date(activitate.data).toLocaleDateString('ro-RO')}`,
    corp: `
      <p>Te invităm să participi la următoarea activitate:</p>
      <div style="background:#e8f5ee;border-radius:10px;padding:16px;margin:14px 0">
        <div style="font-size:16px;font-weight:bold;color:#1a6b4a">${activitate.nume}</div>
        <div style="margin-top:8px;font-size:13px">
          📅 ${new Date(activitate.data).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}<br>
          ${activitate.ora_start ? `🕐 ${activitate.ora_start}${activitate.ora_final ? `–${activitate.ora_final}` : ''}<br>` : ''}
          ${activitate.locatie ? `📍 ${activitate.locatie}<br>` : ''}
          ${activitate.coordonator ? `👤 Coordonator: ${activitate.coordonator}` : ''}
        </div>
      </div>
      ${activitate.descriere ? `<p>${activitate.descriere}</p>` : ''}
      <p>Te rugăm să confirmi participarea coordonatorului.</p>
    `,
  })
}
