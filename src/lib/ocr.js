// src/lib/ocr.js — citire automata a actelor de identitate
// Foloseste Tesseract.js incarcat din CDN (fara instalare de pachete)

const CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'

let incarcat = null
function incarcaTesseract() {
  if (incarcat) return incarcat
  incarcat = new Promise((rezolva, respinge) => {
    if (window.Tesseract) return rezolva(window.Tesseract)
    const s = document.createElement('script')
    s.src = CDN
    s.onload = () => rezolva(window.Tesseract)
    s.onerror = () => respinge(new Error('Nu s-a putut încărca modulul de recunoaștere text'))
    document.head.appendChild(s)
  })
  return incarcat
}

// ── Comprimare imagine inainte de stocare ────────────────────────
export function comprimaImagine(fisier, latimeMax = 1400, calitate = 0.82) {
  return new Promise((rezolva, respinge) => {
    const cititor = new FileReader()
    cititor.onload = e => {
      const img = new Image()
      img.onload = () => {
        let { width: w, height: h } = img
        if (w > latimeMax) { h = Math.round(h * latimeMax / w); w = latimeMax }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          blob => blob ? rezolva({ blob, dataUrl: canvas.toDataURL('image/jpeg', calitate), w, h })
                       : respinge(new Error('Comprimarea a eșuat')),
          'image/jpeg', calitate
        )
      }
      img.onerror = () => respinge(new Error('Fișierul nu este o imagine validă'))
      img.src = e.target.result
    }
    cititor.onerror = () => respinge(new Error('Nu s-a putut citi fișierul'))
    cititor.readAsDataURL(fisier)
  })
}

// Decupeaza banda de jos a imaginii (zona MRZ de pe cartea de identitate)
function decupeazaMRZ(dataUrl, proportie = 0.32) {
  return new Promise(rezolva => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const h = Math.round(img.height * proportie)
      canvas.width = img.width; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, img.height - h, img.width, h, 0, 0, img.width, h)
      // contrast marit, alb-negru — ajuta recunoasterea
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < d.data.length; i += 4) {
        const g = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]
        const v = g > 135 ? 255 : 0
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v
      }
      ctx.putImageData(d, 0, 0)
      rezolva(canvas.toDataURL('image/jpeg', 0.95))
    }
    img.src = dataUrl
  })
}

// ── Interpretare zona MRZ (format TD1, 3 randuri a 30 de caractere) ──
function parseazaMRZ(text) {
  const randuri = text.toUpperCase().replace(/ /g, '')
    .split('\n').map(r => r.trim()).filter(r => r.length >= 20)
  const mrz = randuri.filter(r => /^[A-Z0-9<]+$/.test(r))
  if (mrz.length < 2) return null

  const r1 = mrz.find(r => r.startsWith('I') && r.includes('ROU')) || mrz[0]
  const r3 = mrz.find(r => r.includes('<<')) || mrz[2] || ''
  const r2 = mrz.find(r => r !== r1 && r !== r3 && /^\d{6}/.test(r)) || mrz[1] || ''

  const rez = {}

  // Serie + numar document: 2 litere + 6 cifre
  const doc = (r1.slice(5, 14).replace(/</g, '') || '').match(/([A-Z]{2})(\d{5,6})/)
  if (doc) { rez.ci_serie = doc[1]; rez.ci_numar = doc[2] }

  // CNP — 13 cifre, in zona optionala a primului rand sau oriunde in MRZ
  const cnp = (r1 + r2).replace(/</g, '').match(/[1-8]\d{12}/)
  if (cnp) rez.cnp = cnp[0]

  // Data nasterii din randul 2 (AALLZZ)
  const d = r2.match(/^(\d{2})(\d{2})(\d{2})/)
  if (d) {
    const an = parseInt(d[1]), acum = new Date().getFullYear() % 100
    const secol = an > acum ? 1900 : 2000
    rez.data_nasterii = `${secol + an}-${d[2]}-${d[3]}`
  }

  // Nume si prenume din randul 3
  if (r3.includes('<<')) {
    const [nume, prenume] = r3.split('<<')
    const n = (nume || '').replace(/</g, ' ').trim()
    const p = (prenume || '').replace(/</g, ' ').trim()
    if (n) rez.nume = `${n} ${p}`.trim()
  }

  return Object.keys(rez).length ? rez : null
}

// ── Interpretare text liber (fata actului, certificat de nastere) ──
function parseazaTextLiber(text) {
  const t = text.toUpperCase()
  const rez = {}

  const cnp = t.replace(/[^\dA-Z\n]/g, ' ').match(/[1-8]\d{12}/)
  if (cnp) rez.cnp = cnp[0]

  const serie = t.match(/SERIA?\s*:?\s*([A-Z]{2})\s*NR\.?\s*:?\s*(\d{5,6})/)
  if (serie) { rez.ci_serie = serie[1]; rez.ci_numar = serie[2] }
  else {
    const s2 = t.match(/\b([A-Z]{2})\s?(\d{6})\b/)
    if (s2) { rez.ci_serie = s2[1]; rez.ci_numar = s2[2] }
  }

  const nume = t.match(/NUME(?:LE)?\s*\/?\s*[A-Z]*\s*[\n:]\s*([A-ZĂÂÎȘȚ\- ]{3,40})/)
  const pren = t.match(/PRENUME\s*\/?\s*[A-Z]*\s*[\n:]\s*([A-ZĂÂÎȘȚ\- ]{3,40})/)
  if (nume) rez.nume = `${nume[1].trim()}${pren ? ' ' + pren[1].trim() : ''}`.replace(/\s+/g, ' ')

  const elib = t.match(/(SPCLEP|SPCEP|EVIDENTA PERSOANELOR|POLITIA)\s+([A-ZĂÂÎȘȚ\- ]{3,25})/)
  if (elib) rez.ci_eliberat = `${elib[1]} ${elib[2].trim()}`.replace(/\s+/g, ' ')

  const loc = t.match(/(?:MUN|ORS|ORAS|COM|SAT|JUD)\.?\s+([A-ZĂÂÎȘȚ\- ]{3,25})/)
  if (loc) rez.localitate = loc[1].trim().replace(/\s+/g, ' ')

  return rez
}

// Deduce data nasterii si sexul din CNP
export function dinCNP(cnp) {
  if (!cnp || cnp.length !== 13) return {}
  const s = parseInt(cnp[0])
  const an = parseInt(cnp.slice(1, 3))
  const secol = s <= 2 ? 1900 : s <= 4 ? 1800 : 2000
  return {
    data_nasterii: `${secol + an}-${cnp.slice(3, 5)}-${cnp.slice(5, 7)}`,
    minor: (new Date().getFullYear() - (secol + an)) < 18,
  }
}

// Verificare cifra de control CNP
export function cnpValid(cnp) {
  if (!/^\d{13}$/.test(cnp)) return false
  const c = '279146358279'
  let s = 0
  for (let i = 0; i < 12; i++) s += parseInt(cnp[i]) * parseInt(c[i])
  const r = s % 11
  return parseInt(cnp[12]) === (r === 10 ? 1 : r)
}

// ── Functia principala ───────────────────────────────────────────
export async function citesteDocument(dataUrl, tip = 'ci', onProgres = () => {}) {
  const T = await incarcaTesseract()
  const rezultat = {}

  async function ruleaza(imagine, optiuni, eticheta) {
    onProgres(eticheta, 0)
    const { data } = await T.recognize(imagine, 'ron+eng', {
      logger: m => { if (m.status === 'recognizing text') onProgres(eticheta, m.progress) },
      ...optiuni,
    })
    return data.text || ''
  }

  // Cartea de identitate: intai banda MRZ, care e cea mai precisa
  if (tip === 'ci') {
    try {
      const banda = await decupeazaMRZ(dataUrl)
      const textMRZ = await ruleaza(banda, {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      }, 'Se citește banda de la baza actului')
      const dinMRZ = parseazaMRZ(textMRZ)
      if (dinMRZ) Object.assign(rezultat, dinMRZ)
    } catch { /* se continua cu citirea intregii imagini */ }
  }

  // Citirea intregii imagini — completeaza ce lipseste
  try {
    const textIntreg = await ruleaza(dataUrl, {}, 'Se citește documentul')
    const liber = parseazaTextLiber(textIntreg)
    Object.keys(liber).forEach(k => { if (!rezultat[k]) rezultat[k] = liber[k] })
    rezultat._text = textIntreg
  } catch { /* pastreaza ce s-a gasit din MRZ */ }

  // Completeaza data nasterii din CNP daca lipseste
  if (rezultat.cnp && !rezultat.data_nasterii) {
    const d = dinCNP(rezultat.cnp)
    if (d.data_nasterii) rezultat.data_nasterii = d.data_nasterii
  }
  if (rezultat.cnp) rezultat._cnpValid = cnpValid(rezultat.cnp)

  return rezultat
}
