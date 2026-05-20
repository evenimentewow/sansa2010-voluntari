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
import InrolarePublica from './pages/InrolarePublica'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#1a6b4a' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pagini publice */}
          <Route path="/login" element={<Login />} />
          <Route path="/inrolare-voluntar" element={<InrolarePublica />} />

          {/* Pagini protejate */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="voluntari"  element={<Voluntari />} />
            <Route path="inrolare"   element={<Inrolare />} />
            <Route path="contracte"  element={<Contracte />} />
            <Route path="activitati" element={<Activitati />} />
            <Route path="pontaj"     element={<Pontaj />} />
            <Route path="rapoarte"   element={<Rapoarte />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
