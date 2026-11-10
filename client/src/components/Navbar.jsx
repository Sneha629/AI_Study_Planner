import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Links shown to a logged-in student. Add new pages here (e.g. Study, Stats).
const links = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/subjects', label: 'Subjects', icon: BookIcon },
  { to: '/study', label: 'Study', icon: CardsIcon },
]

function CardsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="7" width="14" height="13" rx="2" />
      <path d="M7 4h11a2 2 0 0 1 2 2v11" />
      <path d="m8 13.5 2 2 3.5-4" />
    </svg>
  )
}

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </svg>
  )
}

function BookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 5.5v15M8 7.5h8M8 11h6" />
    </svg>
  )
}

function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </svg>
  )
}

function ChevronIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
    </svg>
  )
}

function MenuIcon({ open, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  )
}

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="AI Study Planner home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 transition group-hover:scale-105">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M4 6.5 12 3l8 3.5-8 3.5z" />
          <path d="M7 8v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V8" />
          <path d="M20 6.5V12" />
        </svg>
      </span>
      <span className="text-[15px] font-bold tracking-tight text-slate-900">
        Study<span className="text-indigo-600">Planner</span>
        <span className="ml-1.5 rounded-md bg-indigo-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
          AI
        </span>
      </span>
    </Link>
  )
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function Avatar({ name, size = 'h-8 w-8 text-xs' }) {
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 font-semibold text-white ring-2 ring-white`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

// Closes a popup when the user clicks outside it or presses Escape
function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return
    function onPointer(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen, ref])
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useDismiss(open, setOpen, ref)

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-slate-100"
      >
        <Avatar name={user.name} />
        <span className="max-w-36 truncate text-sm font-medium text-slate-700">{user.name}</span>
        <ChevronIcon className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center gap-3 bg-linear-to-br from-indigo-50 to-violet-50 px-4 py-4">
            <Avatar name={user.name} size="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <LogoutIcon className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileRef = useRef(null)
  useDismiss(mobileOpen, setMobileOpen, mobileRef)

  function handleLogout() {
    setMobileOpen(false)
    logout()
    navigate('/login')
  }

  return (
    // Floating rounded bar: stands out from colourful page backgrounds
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div
        ref={mobileRef}
        className="mx-auto max-w-6xl rounded-2xl border border-white/70 bg-white/85 shadow-lg shadow-indigo-900/5 ring-1 ring-slate-900/5 backdrop-blur-xl"
      >
      <nav className="flex h-14 items-center justify-between gap-4 px-3 sm:px-4">
        <div className="flex items-center gap-8">
          <Logo />
          {user && (
            <div className="hidden items-center gap-1 md:flex">
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={linkClass}>
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {user ? (
          <>
            <UserMenu user={user} onLogout={handleLogout} />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
            >
              <MenuIcon open={mobileOpen} className="h-6 w-6" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-700"
            >
              Get started
            </Link>
          </div>
        )}
      </nav>

      {user && mobileOpen && (
        <div className="border-t border-slate-200/70 px-3 pb-3 pt-3 md:hidden">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-linear-to-br from-indigo-50 to-violet-50 p-3">
            <Avatar name={user.name} size="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="space-y-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setMobileOpen(false)}>
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <LogoutIcon className="h-5 w-5" />
              Log out
            </button>
          </div>
        </div>
      )}
      </div>
    </header>
  )
}
