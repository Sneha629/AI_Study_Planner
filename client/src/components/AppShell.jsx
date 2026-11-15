import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getOverview, search } from '../api/dashboard.js'
import { BrandLogo } from './AuthLayout.jsx'
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ChevronIcon,
  CloseIcon,
  GridIcon,
  LogoutIcon,
  MenuIcon,
  QuizIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  SparkIcon,
} from './Icons.jsx'

// Sidebar links (Figma: Workspace section). `dot` marks Study Space when cards are due.
const LINKS = [
  { to: '/', label: 'Dashboard', icon: GridIcon, end: true },
  { to: '/subjects', label: 'My Subjects', icon: BookIcon },
  { to: '/study', label: 'Study Space', icon: SparkIcon, dot: true },
  { to: '/quiz', label: 'AI Quiz', icon: QuizIcon },
  { to: '/planner', label: 'Exam Planner', icon: CalendarIcon },
  { to: '/progress', label: 'Progress & Analytics', icon: ChartIcon },
  { to: '/shared-decks', label: 'Shared Decks', icon: ShareIcon },
]

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function Avatar({ name, className = 'h-8 w-8 text-[11px]' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-brand-violet font-semibold text-white ${className}`}>
      {initials(name)}
    </span>
  )
}

const linkClass = ({ isActive }) =>
  `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
    isActive ? 'bg-white/10 text-white shadow-inner shadow-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
  }`

// Closes a popup on outside click or Escape
function useDismiss(open, close, ref) {
  useEffect(() => {
    if (!open) return
    const onPointer = (e) => ref.current && !ref.current.contains(e.target) && close()
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, ref])
}

function Sidebar({ dueToday, onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useDismiss(menuOpen, () => setMenuOpen(false), menuRef)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col bg-[#0f1226] px-3 py-5 text-white">
      <div className="px-2">
        <BrandLogo light />
      </div>

      <p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
      <nav className="mt-2 space-y-0.5">
        {LINKS.map(({ to, label, icon: Icon, end, dot }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} onClick={onNavigate}>
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {dot && dueToday > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300">
                {dueToday}
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="my-4 h-px bg-white/10" />
      <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
        <SettingsIcon className="h-4 w-4" />
        Settings
      </NavLink>

      {/* User card with Settings / Log out */}
      <div className="relative mt-auto" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#1a1e38] p-1 shadow-2xl">
            <Link
              to="/settings"
              onClick={() => {
                setMenuOpen(false)
                onNavigate?.()
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-200 hover:bg-white/10"
            >
              <SettingsIcon className="h-4 w-4" /> Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-rose-300 hover:bg-white/10"
            >
              <LogoutIcon className="h-4 w-4" /> Log out
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/5"
        >
          <Avatar name={user?.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{user?.name}</span>
            <span className="block truncate text-[11px] text-slate-500">{user?.email}</span>
          </span>
          <span className="text-slate-500" aria-hidden="true">
            ⋯
          </span>
        </button>
      </div>
    </div>
  )
}

function ResultSection({ title, children }) {
  return (
    <div className="py-1.5">
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      {children}
    </div>
  )
}

function ResultRow({ onClick, title, sub }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50">
      <span className="block truncate text-[13px] font-medium text-slate-800">{title}</span>
      {sub && <span className="block truncate text-[11px] text-slate-500">{sub}</span>}
    </button>
  )
}

// Top bar search: the user's subjects, decks and cards. Ctrl/Cmd + K focuses it.
function SearchBox() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const inputRef = useRef(null)
  useDismiss(open, () => setOpen(false), boxRef)

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Search 300 ms after typing stops
  useEffect(() => {
    const text = q.trim()
    const controller = new AbortController()
    const timer = setTimeout(() => {
      if (text.length < 2) return setResults(null)
      search(text, { signal: controller.signal })
        .then(setResults)
        .catch(() => {})
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  function go(path) {
    setOpen(false)
    setQ('')
    navigate(path)
  }

  const empty = results && !results.subjects.length && !results.decks.length && !results.cards.length

  return (
    <div className="relative w-full max-w-md" ref={boxRef}>
      <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-indigo-100">
        <SearchIcon className="h-4 w-4" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search decks, subjects, flashcards…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
          aria-label="Search"
        />
        <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-400 sm:block">Ctrl K</kbd>
      </label>

      {open && q.trim().length >= 2 && results && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {empty && <p className="px-3 py-6 text-center text-[13px] text-slate-500">No results for “{q.trim()}”</p>}
          {results.subjects.length > 0 && (
            <ResultSection title="Subjects">
              {results.subjects.map((s) => (
                <ResultRow key={s._id} onClick={() => go(`/subjects/${s._id}`)} title={s.name} />
              ))}
            </ResultSection>
          )}
          {results.decks.length > 0 && (
            <ResultSection title="Decks">
              {results.decks.map((d) => (
                <ResultRow key={d._id} onClick={() => go(`/subjects/${d.subjectId}/decks/${d._id}`)} title={d.name} sub={d.subjectName} />
              ))}
            </ResultSection>
          )}
          {results.cards.length > 0 && (
            <ResultSection title="Flashcards">
              {results.cards.map((c) => (
                <ResultRow key={c._id} onClick={() => go(`/subjects/${c.subjectId}/decks/${c.deckId}`)} title={c.front} sub={`${c.deckName} · ${c.back}`} />
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  )
}

function TopBar({ onMenu }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useDismiss(open, () => setOpen(false), ref)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <button type="button" onClick={onMenu} aria-label="Open menu" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
        <MenuIcon className="h-5 w-5" />
      </button>
      <SearchBox />
      <div className="relative ml-auto" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100"
        >
          <Avatar name={user?.name} className="h-7 w-7 text-[10px]" />
          <span className="hidden max-w-32 truncate text-[13px] font-medium text-slate-700 sm:block">{user?.name?.split(' ')[0]}</span>
          <ChevronIcon className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Avatar name={user?.name} className="h-9 w-9 text-xs" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-900">{user?.name}</p>
                <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
              </div>
            </div>
            <div className="p-1">
              <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50">
                <SettingsIcon className="h-4 w-4" /> Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50"
              >
                <LogoutIcon className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

// Logged-in layout from the Figma design: dark sidebar on the left, top bar, page content
export default function AppShell({ children }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dueToday, setDueToday] = useState(0)

  // Refresh the "cards due" dot when the page changes (e.g. after a study session)
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    getOverview({ signal: controller.signal })
      .then((data) => setDueToday(data.totals?.dueToday ?? 0))
      .catch(() => {})
    return () => controller.abort()
  }, [pathname, user])

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
        <Sidebar dueToday={dueToday} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-slate-900/50" />
          <aside className="absolute inset-y-0 left-0 w-64">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            <Sidebar dueToday={dueToday} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <TopBar onMenu={() => setDrawerOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
