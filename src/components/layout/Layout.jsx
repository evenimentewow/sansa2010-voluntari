import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X, Settings } from 'lucide-react'
import Sidebar from './Sidebar'
import AdminPanel from '../../pages/AdminPanel'
import { useAuth } from '../../context/AuthContext'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [admin, setAdmin] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const esteAdmin = user?.rol === 'admin'

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = (open || admin) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, admin])

  return (
    <div className="app-shell">
      {/* Bara mobil */}
      <header className="mobile-topbar no-print">
        <button className="mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Deschide meniul">
          <Menu size={22} />
        </button>
        <div className="mobile-title"><span>Asociația ȘANSA 2010</span></div>
        {esteAdmin && (
          <button className="mobile-menu-btn ml-auto" onClick={() => setAdmin(true)} aria-label="Administrare">
            <Settings size={20} />
          </button>
        )}
      </header>

      {open && <div className="drawer-overlay no-print" onClick={() => setOpen(false)} />}

      <div className={`drawer no-print ${open ? 'drawer-open' : ''}`}>
        <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Închide meniul">
          <X size={20} />
        </button>
        <Sidebar />
      </div>

      <main className="app-main">
        {/* Buton administrare — desktop, dreapta sus */}
        {esteAdmin && (
          <button className="admin-fab no-print" onClick={() => setAdmin(true)} title="Administrare">
            <Settings size={16} /> <span>Administrare</span>
          </button>
        )}
        <Outlet />
      </main>

      <AdminPanel open={admin} onClose={() => setAdmin(false)} />
    </div>
  )
}
