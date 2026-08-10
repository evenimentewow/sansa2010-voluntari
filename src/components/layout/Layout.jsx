import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Inchide meniul la schimbarea paginii
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Blocheaza scroll-ul in spatele meniului deschis
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="app-shell">
      {/* Bara mobil */}
      <header className="mobile-topbar no-print">
        <button className="mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Deschide meniul">
          <Menu size={22} />
        </button>
        <div className="mobile-title">
          <span>Asociația ȘANSA 2010</span>
        </div>
      </header>

      {/* Overlay */}
      {open && <div className="drawer-overlay no-print" onClick={() => setOpen(false)} />}

      {/* Meniu lateral */}
      <div className={`drawer no-print ${open ? 'drawer-open' : ''}`}>
        <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Închide meniul">
          <X size={20} />
        </button>
        <Sidebar />
      </div>

      {/* Continut */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
