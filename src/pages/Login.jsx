import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) { setError('Email sau parolă incorecte.'); setLoading(false); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-serif text-3xl mb-1" style={{ color: '#1a6b4a' }}>Asociația</div>
          <div className="font-serif text-3xl" style={{ color: '#1a6b4a' }}>ȘANSA 2010</div>
          <div className="text-sm text-gray-400 mt-2">Sistem de gestiune voluntari</div>
        </div>
        <div className="card">
          <h2 className="font-serif text-xl mb-5">Autentificare</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Email</label>
              <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="adresa@email.ro" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 block">Parolă</label>
              <input className="form-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Se autentifică...' : 'Intră în cont'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">CIF 27772126 · Pașcani, Iași</p>
      </div>
    </div>
  )
}
