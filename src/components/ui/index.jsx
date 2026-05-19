import { X } from 'lucide-react'

// ── PageHeader ──────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
      <div>
        <h1 className="font-serif text-2xl text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  )
}

// ── StatCard ────────────────────────────────────────────────────
export function StatCard({ num, label, color = 'green' }) {
  const colors = {
    green: '#1a6b4a',
    gold:  '#c8a84b',
    blue:  '#3b82f6',
    red:   '#dc2626',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: colors[color] }} />
      <div className="font-serif text-4xl text-gray-800 leading-none">{num}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-1.5">{label}</div>
    </div>
  )
}

// ── Badge ───────────────────────────────────────────────────────
const badgeStyles = {
  green: 'bg-green-100 text-green-800',
  gold:  'bg-yellow-100 text-yellow-800',
  gray:  'bg-gray-100 text-gray-600',
  red:   'bg-red-100 text-red-800',
  blue:  'bg-blue-100 text-blue-800',
}

export function Badge({ variant = 'gray', children }) {
  return (
    <span className={`badge ${badgeStyles[variant]}`}>{children}</span>
  )
}

// ── Avatar ──────────────────────────────────────────────────────
export function Avatar({ name, size = 8 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0`}
      style={{ background: '#e8f5ee', color: '#1a6b4a' }}
    >
      {initials}
    </div>
  )
}

// ── Modal ───────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, footer }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between p-7 pb-0">
          <div>
            <h2 className="font-serif text-xl text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-7">{children}</div>
        {footer && (
          <div className="px-7 pb-7 flex gap-3 justify-end">{footer}</div>
        )}
      </div>
    </div>
  )
}

// ── SectionTitle ────────────────────────────────────────────────
export function SectionTitle({ children }) {
  return (
    <div className="text-xs font-bold uppercase tracking-widest mt-5 mb-3 pb-1.5 border-b-2"
      style={{ color: '#1a6b4a', borderColor: '#e8f5ee' }}>
      {children}
    </div>
  )
}

// ── FormGroup ───────────────────────────────────────────────────
export function FormGroup({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <span className="text-xs text-gray-400 italic">{hint}</span>}
    </div>
  )
}

// ── Spinner ─────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin"
        style={{ borderTopColor: '#1a6b4a' }} />
    </div>
  )
}

// ── EmptyState ──────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="text-center py-16">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="font-serif text-lg text-gray-700 mb-2">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400 mb-6">{subtitle}</p>}
      {action}
    </div>
  )
}
