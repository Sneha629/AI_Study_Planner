import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getOverview } from '../api/dashboard.js'
import { createSubject, deleteSubject, updateSubject } from '../api/subjects.js'
import PageHeader, { cardClass, primaryBtn, secondaryBtn } from '../components/PageHeader.jsx'
import Modal, { fieldInput, fieldLabel, fieldTextarea } from '../components/Modal.jsx'
import { EditIcon, IconButton, TrashIcon } from '../components/IconButtons.jsx'
import { BookIcon, CalendarIcon, SearchIcon, SparkIcon, TargetIcon } from '../components/Icons.jsx'

// One colour set per subject card, used in turn (Figma: violet, green, amber)
const PALETTE = [
  { icon: 'bg-indigo-50 text-brand-500', corner: 'bg-indigo-100/60', box: 'bg-indigo-50/60 border-indigo-100', bar: 'bg-brand-500' },
  { icon: 'bg-emerald-50 text-emerald-600', corner: 'bg-emerald-100/60', box: 'bg-emerald-50/60 border-emerald-100', bar: 'bg-emerald-500' },
  { icon: 'bg-amber-50 text-amber-600', corner: 'bg-amber-100/60', box: 'bg-amber-50/60 border-amber-100', bar: 'bg-amber-400' },
  { icon: 'bg-sky-50 text-sky-600', corner: 'bg-sky-100/60', box: 'bg-sky-50/60 border-sky-100', bar: 'bg-sky-500' },
]

const SORTS = {
  recent: { label: 'Recently added', fn: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
  exam: { label: 'Exam soonest', fn: (a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9) },
  name: { label: 'Name A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
}

const FILTERS = { all: 'All subjects', exam: 'With an exam', none: 'No exam date' }

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function longDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function errorText(err, fallback) {
  return err.response?.data?.details?.[0]?.message || err.response?.data?.error || fallback
}

// Add or edit a subject: name, exam date, description
function SubjectModal({ subject, onClose, onSaved }) {
  const editing = Boolean(subject?._id)
  const [form, setForm] = useState({
    name: subject?.name ?? '',
    examDate: subject?.examDate ?? '',
    description: subject?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return toast.error('Give the subject a name.')
    if (form.examDate && form.examDate < todayLocal()) return toast.error('Exam date cannot be in the past.')
    setSaving(true)
    try {
      const saved = editing
        ? await updateSubject(subject._id, { name, examDate: form.examDate || null, description: form.description })
        : await createSubject({ name, examDate: form.examDate, description: form.description })
      toast.success(editing ? 'Subject updated' : 'Subject added')
      onSaved(saved)
    } catch (err) {
      toast.error(errorText(err, 'Could not save the subject.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={<BookIcon />}
      title={editing ? 'Edit subject' : 'Add a new subject'}
      subtitle="A subject holds your decks, notes and exam date."
    >
      <form onSubmit={save} className="space-y-4" noValidate>
        <div>
          <label htmlFor="s-name" className={fieldLabel}>Subject name</label>
          <input id="s-name" value={form.name} onChange={set('name')} maxLength={100} placeholder="e.g. Physics" className={fieldInput} />
        </div>
        <div>
          <label htmlFor="s-exam" className={fieldLabel}>Exam date (optional)</label>
          <input id="s-exam" type="date" value={form.examDate} min={todayLocal()} onChange={set('examDate')} className={fieldInput} />
        </div>
        <div>
          <label htmlFor="s-desc" className={fieldLabel}>Description (optional)</label>
          <textarea id="s-desc" rows={3} value={form.description} onChange={set('description')} maxLength={300} placeholder="What does this subject cover?" className={fieldTextarea} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryBtn}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add subject'}</button>
        </div>
      </form>
    </Modal>
  )
}

function SubjectCard({ subject, style, onEdit, onDelete }) {
  const progress = subject.totalCards ? Math.round((subject.learnedCards / subject.totalCards) * 100) : 0
  const soon = subject.daysLeft !== null && subject.daysLeft <= 7

  return (
    <div className={`${cardClass} relative overflow-hidden p-5`}>
      <div aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full ${style.corner}`} />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.icon}`}>
            <SparkIcon />
          </span>
          <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
            {subject.name.slice(0, 3)}
          </span>
        </div>
        <div className="flex gap-1.5">
          <IconButton label={`Edit ${subject.name}`} onClick={onEdit}><EditIcon /></IconButton>
          <IconButton label={`Delete ${subject.name}`} onClick={onDelete} danger><TrashIcon /></IconButton>
        </div>
      </div>

      <h3 className="relative mt-4 truncate text-xl font-medium tracking-tight text-slate-900">{subject.name}</h3>
      <p className="relative mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{subject.description || 'No description yet.'}</p>

      <div className={`relative mt-4 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${style.box}`}>
        <CalendarIcon className="h-4 w-4 text-slate-500" />
        {subject.examDate ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-500">Next exam</p>
              <p className="truncate text-xs font-medium text-slate-800">{longDate(subject.examDate)}</p>
            </div>
            <div className="border-l border-slate-200 pl-3 text-right">
              <span className={`text-lg font-semibold ${soon ? 'text-rose-500' : 'text-slate-800'}`}>{Math.max(0, subject.daysLeft)}</span>
              <span className="ml-1 text-[10px] text-slate-500">days left</span>
            </div>
          </>
        ) : (
          <button type="button" onClick={onEdit} className="text-xs font-medium text-brand-500 hover:underline">
            No exam date · Set one
          </button>
        )}
      </div>

      <p className="relative mt-4 text-[11px] text-slate-500">
        {subject.deckCount} {subject.deckCount === 1 ? 'deck' : 'decks'} · <b className="font-semibold text-slate-700">{subject.totalCards}</b> flashcards
        {subject.dueToday > 0 && <span className="text-brand-500"> · {subject.dueToday} due today</span>}
      </p>
      <div className="relative mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>Overall completion</span>
        <span className="font-semibold text-slate-700">{progress}%</span>
      </div>
      <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${progress}%` }} />
      </div>

      <Link
        to={`/subjects/${subject._id}`}
        className="relative mt-5 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-2.5 text-[13px] font-semibold text-brand-500 transition hover:bg-brand-500 hover:text-white"
      >
        Continue studying <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

// My Subjects (Figma design): summary, search / filter / sort, subject cards
export default function Subjects() {
  const [subjects, setSubjects] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [editing, setEditing] = useState(null) // null | {} (new) | subject
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getOverview({ signal: controller.signal })
      .then((data) => setSubjects(data.subjects))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Could not load your subjects.')
      })
    return () => controller.abort()
  }, [reloadKey])

  const shown = useMemo(() => {
    if (!subjects) return []
    const q = query.trim().toLowerCase()
    return subjects
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
      .filter((s) => filter === 'all' || (filter === 'exam' ? s.examDate : !s.examDate))
      .sort(SORTS[sort].fn)
  }, [subjects, query, filter, sort])

  async function handleDelete(subject) {
    if (!window.confirm(`Delete “${subject.name}”? Its decks, cards, notes and reviews will be deleted too.`)) return
    try {
      await deleteSubject(subject._id)
      setSubjects((list) => list.filter((s) => s._id !== subject._id))
      toast.success('Subject deleted')
    } catch (err) {
      toast.error(errorText(err, 'Could not delete the subject.'))
    }
  }

  const upcoming = subjects?.filter((s) => s.daysLeft !== null && s.daysLeft >= 0).length ?? 0
  const totalCards = subjects?.reduce((n, s) => n + s.totalCards, 0) ?? 0
  const learned = subjects?.reduce((n, s) => n + s.learnedCards, 0) ?? 0
  const overall = totalCards ? Math.round((learned / totalCards) * 100) : 0
  const selectClass = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-brand-500'

  return (
    <div>
      <PageHeader
        eyebrow="Your learning library"
        title="My Subjects"
        subtitle="Everything you're learning, organised into focused spaces."
        action={
          <button type="button" onClick={() => setEditing({})} className={`${primaryBtn} px-5 py-2.5`}>
            + Add new subject
          </button>
        }
      />

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className={`${cardClass} mb-5 grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-brand-500"><BookIcon /></span>
          <div><p className="text-[11px] text-slate-500">Total subjects</p><p className="text-xl font-semibold text-slate-900">{subjects?.length ?? '–'}</p></div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><CalendarIcon /></span>
          <div><p className="text-[11px] text-slate-500">Upcoming exams</p><p className="text-xl font-semibold text-slate-900">{subjects ? upcoming : '–'}</p></div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><TargetIcon /></span>
          <div className="min-w-0 flex-1"><p className="text-[11px] text-slate-500">Overall progress</p><p className="text-xl font-semibold text-slate-900">{subjects ? `${overall}%` : '–'}</p></div>
          <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 md:block">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${overall}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <label className="flex h-10 min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm focus-within:border-brand-500 sm:max-w-sm">
          <SearchIcon className="h-4 w-4" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your subjects…" aria-label="Search subjects" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400" />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter" className={selectClass}>
          {Object.entries(FILTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className={selectClass}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {!subjects && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />)}
        </div>
      )}

      {subjects?.length === 0 && (
        <div className={`${cardClass} px-6 py-14 text-center`}>
          <p className="text-sm text-slate-500">No subjects yet. Add your first one to start making flashcards.</p>
          <button type="button" onClick={() => setEditing({})} className={`${primaryBtn} mt-4`}>+ Add new subject</button>
        </div>
      )}
      {subjects?.length > 0 && shown.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No subjects match your search.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((s) => (
          <SubjectCard
            key={s._id}
            subject={s}
            style={PALETTE[subjects.findIndex((x) => x._id === s._id) % PALETTE.length]}
            onEdit={() => setEditing(s)}
            onDelete={() => handleDelete(s)}
          />
        ))}
      </div>

      {editing && (
        <SubjectModal
          subject={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setReloadKey((k) => k + 1) // reload so counts and days left stay right
          }}
        />
      )}
    </div>
  )
}
