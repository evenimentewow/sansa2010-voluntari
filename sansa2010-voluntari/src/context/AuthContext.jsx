import { createContext, useContext, useState } from 'react'

const AuthContext = createContext({})

const USERS = [
  { email: 'asociatia.sansa2010@gmail.com', password: 'Sansa2010!', nume: 'Spiridon Mihaela-Iulia', rol: 'admin' },
  { email: 'guest@sansa2010.ro', password: 'Guest2010!', nume: 'Utilizator Guest', rol: 'guest' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sansa_user')) } 
    catch { return null }
  })

  function signIn(email, password) {
    const found = USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const u = { email: found.email, nume: found.nume, rol: found.rol }
      sessionStorage.setItem('sansa_user', JSON.stringify(u))
      setUser(u)
      return { data: { user: u }, error: null }
    }
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
