import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext({})

const USERS = [
  { email: 'asociatia.sansa2010@gmail.com', password: 'Sansa2010!', nume: 'Spiridon Mihaela-Iulia', rol: 'admin' }
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sansa_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

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
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)