import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, FileText,
  CalendarDays, ClipboardCheck, BarChart3, LogOut, Link2, HandCoins, FolderKanban
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/',             icon: LayoutDashboard,  label: 'Dashboard',      adminOnly: true },
  { to: '/voluntari',    icon: Users,            label: 'Voluntari',      adminOnly: true },
  { to: '/inrolare',     icon: UserPlus,         label: 'Înrolare nouă',  adminOnly: true },
  { to: '/contracte',    icon: FileText,         label: 'Contracte',      adminOnly: true },
  { to: '/activitati',   icon: CalendarDays,     label: 'Activități',     adminOnly: true },
  { to: '/pontaj',       icon: ClipboardCheck,   label: 'Pontaj',         adminOnly: true },
  { to: '/rapoarte',     icon: BarChart3,        label: 'Rapoarte',       adminOnly: false },
  { to: '/sponsorizari', icon: HandCoins,        label: 'Sponsorizări',   adminOnly: false },
  { to: '/proiecte',     icon: FolderKanban,     label: 'Proiecte',       adminOnly: false },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const publicLink = `${window.location.origin}/inrolare-voluntar`
  const isGuest = user?.rol === 'guest'

  const visibleItems = navItems.filter(item => !item.adminOnly || !isGuest)

  async function handleSignOut() {
    signOut()
    navigate('/login')
  }

  function copyLink() {
    navigator.clipboard.writeText(publicLink)
    alert('✅ Link copiat! Trimite-l voluntarilor.')
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#1a6b4a' }}>
      <div className="px-6 py-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="font-serif text-white text-lg leading-tight">
          Asociația<br />ȘANSA 2010
        </div>
        <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          CIF 27772126 · Pașcani, IS
        </div>
      </div>

      <nav className="flex-1 py-4">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-6 py-2.5 text-sm font-medium transition-all duration-150 border-l-[3px] ${
                isActive ? 'text-white border-[#c8a84b]' : 'border-transparent hover:text-white'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {!isGuest && (
          <div className="mx-4 mt-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: '#c8a84b' }}>🔗 Link înrolare publică</div>
            <p className="text-xs mb-2 break-all" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{publicLink}</p>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 text-xs font-medium transition-all w-full justify-center py-1.5 rounded-md"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <Link2 size={11} /> Copiază link
            </button>
          </div>
        )}
      </nav>

      <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        {user && (
          <div className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {user.rol === 'admin' ? '👑' : user.rol === 'guest' ? '👤 Guest' : '👤'} {user.nume || user.email}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <LogOut size={13} /> Deconectare
        </button>
      </div>
    </aside>
  )
}
