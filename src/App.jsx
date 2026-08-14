import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Voluntari from './pages/Voluntari'
import Inrolare from './pages/Inrolare'
import Contracte from './pages/Contracte'
import Activitati from './pages/Activitati'
import Pontaj from './pages/Pontaj'
import Rapoarte from './pages/Rapoarte'
import Sponsorizari from './pages/Sponsorizari'
import InrolarePublica from './pages/InrolarePublica'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#1a6b4a' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  // Guest are acces DOAR la sponsorizări
  if (user.rol === 'guest' && adminOnly) return <Navigate to="/sponsorizari" replace />
  return children
}

function HomeRedirect() {
  const { user } = useAuth()
  // Guest ajunge direct la sponsorizări
  if (user?.rol === 'guest') return <Navigate to="/sponsorizari" replace />
  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/inrolare-voluntar" element={<InrolarePublica />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomeRedirect />} />
            <Route path="voluntari"    element={<ProtectedRoute adminOnly><Voluntari /></ProtectedRoute>} />
            <Route path="inrolare"     element={<ProtectedRoute adminOnly><Inrolare /></ProtectedRoute>} />
            <Route path="contracte"    element={<ProtectedRoute adminOnly><Contracte /></ProtectedRoute>} />
            <Route path="activitati"   element={<ProtectedRoute adminOnly><Activitati /></ProtectedRoute>} />
            <Route path="pontaj"       element={<ProtectedRoute adminOnly><Pontaj /></ProtectedRoute>} />
            <Route path="rapoarte"     element={<Rapoarte />} />
            <Route path="sponsorizari" element={<Sponsorizari />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
