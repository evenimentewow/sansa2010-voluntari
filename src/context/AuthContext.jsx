import { createContext, useContext, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Cont de rezerva — functioneaza si daca baza de date nu raspunde
const FALLBACK = [
  { email: 'asociatia.sansa2010@gmail.com', parola: 'Sansa2010!', nume: 'Spiridon Mihaela-Iulia', rol: 'admin' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sansa_user')) }
    catch { return null }
  })

  function aplica(u) {
    const acc = { email: u.email, nume: u.nume, rol: u.rol }
    sessionStorage.setItem('sansa_user', JSON.stringify(acc))
    setUser(acc)
    return { data: { user: acc }, error: null }
  }

  async function signIn(email, parola) {
    const mail = String(email || '').trim().toLowerCase()

    // 1) Utilizatori din baza de date
    try {
      const { data } = await supabase
        .from('app_users')
        .select('email,parola,nume,rol,activ')
        .eq('email', mail)
        .maybeSingle()

      if (data && data.activ && data.parola === parola) return aplica(data)
      if (data) return { data: null, error: { message: 'Email sau parolă incorecte.' } }
    } catch {
      // baza de date indisponibila — se incearca contul de rezerva
    }

    // 2) Cont de rezerva
    const f = FALLBACK.find(u => u.email === mail && u.parola === parola)
    if (f) return aplica(f)

    return { data: null, error: { message: 'Email sau parolă incorecte.' } }
  }

  function signOut() {
    sessionStorage.removeItem('sansa_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
