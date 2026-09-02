import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Conturi de rezerva — functioneaza si cand baza de date nu raspunde
const REZERVA = [
  { email: 'asociatia.sansa2010@gmail.com', parola: 'Sansa2010!', nume: 'Spiridon Mihaela-Iulia', rol: 'admin' },
  { email: 'guest@sansa2010.ro',            parola: 'Guest2010!', nume: 'Utilizator Guest',       rol: 'guest' },
]

const CHEIE = 'sansa_user'

// Pastreaza sesiunea intre vizite; daca localStorage e blocat, foloseste sessionStorage
const depozit = {
  ia() {
    try { return localStorage.getItem(CHEIE) || sessionStorage.getItem(CHEIE) }
    catch { return null }
  },
  pune(v) {
    try { localStorage.setItem(CHEIE, v) } catch {
      try { sessionStorage.setItem(CHEIE, v) } catch {}
    }
  },
  sterge() {
    try { localStorage.removeItem(CHEIE) } catch {}
    try { sessionStorage.removeItem(CHEIE) } catch {}
  },
}

// Interogare cu reincercari — acopera pornirea proiectului si intreruperile scurte
async function cautaUtilizator(email, incercari = 3) {
  for (let i = 0; i < incercari; i++) {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('email,parola,nume,rol,activ')
        .eq('email', email)
        .maybeSingle()
      if (!error) return { ok: true, data }
    } catch { /* se reincearca */ }
    if (i < incercari - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)))
  }
  return { ok: false, data: null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(depozit.ia()) } catch { return null }
  })

  // Trezeste baza de date la deschiderea aplicatiei, ca prima autentificare sa nu esueze
  useEffect(() => {
    supabase.from('app_users').select('email').limit(1).then(() => {}, () => {})
  }, [])

  function aplica(u) {
    const cont = { email: u.email, nume: u.nume, rol: u.rol }
    depozit.pune(JSON.stringify(cont))
    setUser(cont)
    return { data: { user: cont }, error: null }
  }

  async function signIn(emailBrut, parolaBruta) {
    // Curata spatiile invizibile lasate de tastatura sau completarea automata
    const email = String(emailBrut || '').trim().toLowerCase()
    const parola = String(parolaBruta || '').trim()

    if (!email || !parola) {
      return { data: null, error: { message: 'Completați emailul și parola.' } }
    }

    // 1) Conturile de rezerva — verificate primele, nu depind de retea
    const r = REZERVA.find(u => u.email === email && u.parola === parola)
    if (r) return aplica(r)

    // 2) Utilizatorii din baza de date
    const rezultat = await cautaUtilizator(email)

    if (!rezultat.ok) {
      return { data: null, error: {
        message: 'Serverul nu răspunde momentan. Încearcă din nou peste câteva secunde.',
      }}
    }

    const u = rezultat.data
    if (!u) return { data: null, error: { message: 'Email sau parolă incorecte.' } }
    if (!u.activ) return { data: null, error: { message: 'Acest cont este dezactivat. Contactează administratorul.' } }
    if (String(u.parola).trim() !== parola) return { data: null, error: { message: 'Email sau parolă incorecte.' } }

    return aplica(u)
  }

  function signOut() {
    depozit.sterge()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
