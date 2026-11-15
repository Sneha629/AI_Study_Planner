import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getOverview } from '../api/dashboard.js'
import { createDeckWithDetails, deleteDeck, getDecks, getExamPlan, updateDeck } from '../api/decks.js'
import { getSubjectActivity } from '../api/subjects.js'
import { cardClass, primaryBtn, secondaryBtn } from '../components/PageHeader.jsx'
import Modal, { fieldInput, fieldLabel, fieldTextarea } from '../components/Modal.jsx'
import { EditIcon, IconButton, TrashIcon } from '../components/IconButtons.jsx'
import { CheckIcon, PlayIcon, SparkIcon } from '../components/Icons.jsx'

const LayersIcon = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
)

const STATUS = {
  'on-track': { label: 'On track', className: 'bg-emerald-50 text-emerald-700' },
  behind: { label: 'Behind', className: 'bg-amber-50 text-amber-700' },
}

function longDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dayName(ymd) {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })
}

// "Studied today at 9:24 am" / "Studied yesterday" / "Studied 4 days ago"
function lastStudied(iso) {
  if (!iso) return 'Not studied yet'
  const at = new Date(iso)
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((start(new Date()) - start(at)) / 86400000)
  if (days <= 0) return `Studied today at ${at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
  if (days === 1) return 'Studied yesterday'
  return `Studied ${days} days ago`
}

function errorText(err, fallback) {
  return err.response?.data?.details?.[0]?.message || err.response?.data?.error || fallback
}

// Figma "Create a new deck" popup, also used to edit a deck
function DeckModal({ subjectId, deck, onClose, onSaved }) {
  const editing = Boolean(deck?._id)
  const [name, setName] = useState(deck?.name ?? '')
  const [description, setDescription] = useState(deck?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Give the deck a name.')
    setSaving(true)
    try {
      const saved = editing
        ? await updateDeck(deck._id, { name: name.trim(), description })
        : await createDeckWithDetails(subjectId, { name: name.trim(), description })
      toast.success(editing ? 'Deck updated' : 'Deck created')
      onSaved(saved)
    } catch (err) {
      toast.error(errorText(err, 'Could not save the deck.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={<LayersIcon />}
      title={editing ? 'Edit deck' : 'Create a new deck'}
      subtitle="Group related concepts into a focused flashcard collection."
    >
      <form onSubmit={save} className="space-y-4" noValidate>
        <div>
          <label htmlFor="d-name" className={fieldLabel}>Deck name</label>
          <input id="d-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Work and Energy" className={fieldInput} />
        </div>
        <div>
          <label htmlFor="d-desc" className={fieldLabel}>Description</label>
          <textarea id="d-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="What will this deck cover?" className={fieldTextarea} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryBtn}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add deck'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ExamCard({ subject, plan }) {
  const learnedPct = subject.totalCards ? Math.round((subject.learnedCards / subject.totalCards) * 100) : 0

  if (!subject.examDate) {
    return (
      <section className={`${cardClass} flex flex-col justify-center p-6 text-center`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Exam preparation</p>
        <p className="mt-2 text-sm text-slate-500">No exam date yet. Add one to get a day-by-day plan.</p>
        <Link to="/subjects" className="mt-3 text-xs font-semibold text-brand-500 hover:underline">Set an exam date →</Link>
      </section>
    )
  }

  const status = STATUS[plan?.status]
  const steps = [
    { done: plan?.newPerDay === 0, text: plan?.newPerDay ? `Learn ${plan.newPerDay} new ${plan.newPerDay === 1 ? 'card' : 'cards'} a day` : 'All new cards learned', sub: `${plan?.newCardsLeft ?? 0} new cards left` },
    { done: subject.dueToday === 0, text: subject.dueToday ? `Review ${subject.dueToday} cards due today` : 'Reviews done for today', sub: 'Keeps what you learned fresh' },
  ]

  return (
    <section className={`${cardClass} p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Exam preparation</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">{subject.name} exam</h2>
        </div>
        {status && <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/60">
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-slate-500">Exam date</p>
          <p className="text-[13px] font-medium text-slate-800">{longDate(subject.examDate)}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-slate-500">Remaining</p>
          <p className="text-[13px] font-medium text-slate-800">{subject.daysLeft === 0 ? 'Exam today' : `${Math.max(0, subject.daysLeft)} days`}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-[11px] text-slate-500">
        <span>Study plan progress</span>
        <span>{subject.learnedCards} of {subject.totalCards} cards learned</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-linear-to-r from-brand-500 to-brand-violet" style={{ width: `${learnedPct}%` }} />
      </div>

      <p className="mt-5 text-[11px] font-medium text-slate-500">Today's plan</p>
      <ul className="mt-2 space-y-2">
        {steps.map((s) => (
          <li key={s.text} className="flex items-center gap-3">
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
              {s.done && <CheckIcon className="h-3 w-3" />}
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-medium text-slate-800">{s.text}</span>
              <span className="block text-[11px] text-slate-400">{s.sub}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link to="/planner" className="mt-4 inline-block text-xs font-medium text-brand-500 hover:underline">Open exam planner →</Link>
    </section>
  )
}

function ActivityCard({ days }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.reviewed, d.newCards]))
  return (
    <section className={`${cardClass} p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Last 7 days</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">Study activity</h2>
        </div>
        <div className="flex gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-500" />Reviewed</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-teal-400" />New cards</span>
        </div>
      </div>
      <div className="mt-6 flex h-44 gap-3 border-b border-slate-100">
        {days.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col">
            <div className="flex flex-1 items-end justify-center gap-1" title={`${d.reviewed} reviewed, ${d.newCards} new`}>
              <div className="w-3 rounded-t bg-brand-500" style={{ height: `${(d.reviewed / max) * 100}%` }} />
              <div className="w-3 rounded-t bg-teal-400" style={{ height: `${(d.newCards / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {days.map((d) => <span key={d.date} className="flex-1 text-center text-[10px] text-slate-400">{dayName(d.date)}</span>)}
      </div>
      {days.every((d) => !d.reviewed && !d.newCards) && <p className="mt-3 text-center text-xs text-slate-400">No study in this subject in the last 7 days.</p>}
    </section>
  )
}

function DeckCard({ subjectId, deck, onEdit, onDelete }) {
  const pct = deck.cardCount ? Math.round((deck.learnedCards / deck.cardCount) * 100) : 0
  return (
    <div className={`${cardClass} relative overflow-hidden p-5`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-brand-500 to-brand-violet" />
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-brand-500"><LayersIcon /></span>
        <div className="flex gap-1.5">
          <IconButton label={`Edit ${deck.name}`} onClick={onEdit}><EditIcon /></IconButton>
          <IconButton label={`Delete ${deck.name}`} onClick={onDelete} danger><TrashIcon /></IconButton>
        </div>
      </div>
      <h3 className="mt-4 truncate text-lg font-medium tracking-tight text-slate-900">{deck.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{deck.description || 'No description yet.'}</p>

      <div className="mt-5 flex items-center justify-between text-[11px] text-slate-500">
        <span>{deck.cardCount} cards{deck.dueToday > 0 && <span className="text-brand-500"> · {deck.dueToday} due</span>}</span>
        <span>{lastStudied(deck.lastStudiedAt)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>Learned</span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
      <Link
        to={`/subjects/${subjectId}/decks/${deck._id}`}
        className="mt-5 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-2.5 text-[13px] font-semibold text-brand-500 transition hover:bg-brand-500 hover:text-white"
      >
        Open deck <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

// Subject page (Figma design): exam preparation, weekly activity and the subject's decks
export default function SubjectDecks() {
  const { id } = useParams()
  const [data, setData] = useState(null) // { subject, decks, plan, activity }
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | {} (new) | deck
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    Promise.all([getOverview({ signal }), getDecks(id), getExamPlan(id), getSubjectActivity(id, { signal })])
      .then(([overview, decks, plan, activity]) => {
        const subject = overview.subjects.find((s) => s._id === id)
        if (!subject) return setError('Subject not found.')
        setData({ subject, decks, plan, activity })
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED') return
        setError(err.response?.status === 404 ? 'Subject not found.' : 'Could not load this subject.')
      })
    return () => controller.abort()
  }, [id, reloadKey])

  async function handleDelete(deck) {
    if (!window.confirm(`Delete “${deck.name}”? Its ${deck.cardCount} cards and their reviews will be deleted too.`)) return
    try {
      await deleteDeck(deck._id)
      toast.success('Deck deleted')
      setReloadKey((k) => k + 1)
    } catch (err) {
      toast.error(errorText(err, 'Could not delete the deck.'))
    }
  }

  if (error) {
    return (
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <p className="text-sm text-slate-500">{error}</p>
        <Link to="/subjects" className={`${secondaryBtn} mt-4`}>Back to my subjects</Link>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
      </div>
    )
  }

  const { subject, decks, plan, activity } = data

  return (
    <div>
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/subjects" className="hover:text-slate-900">My Subjects</Link>
        <span>›</span>
        <span className="font-medium text-slate-700">{subject.name}</span>
      </nav>

      <div className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500">Subject</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight text-slate-900">{subject.name}</h1>
          {subject.description && <p className="mt-1 text-sm text-slate-500">{subject.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/subjects/${id}/notes`} className={secondaryBtn}>
            <SparkIcon className="h-4 w-4 text-brand-500" /> Make cards from notes
          </Link>
          <Link to={`/study?subjectId=${id}`} className={primaryBtn}>
            <PlayIcon className="h-3.5 w-3.5" /> Study this subject
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <ExamCard subject={subject} plan={plan} />
        <ActivityCard days={activity} />
      </div>

      <div className="mb-3 mt-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Flashcard collections</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">
            Your decks <span className="text-sm text-slate-400">{decks.length}</span>
          </h2>
        </div>
        <button type="button" onClick={() => setEditing({})} className={`${primaryBtn} px-5 py-2.5`}>+ New deck</button>
      </div>

      {decks.length === 0 ? (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <p className="text-sm text-slate-500">No decks yet. Create one, or let AI make cards from your notes.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => setEditing({})} className={primaryBtn}>+ New deck</button>
            <Link to={`/subjects/${id}/notes`} className={secondaryBtn}>Make cards from notes</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard key={deck._id} subjectId={id} deck={deck} onEdit={() => setEditing(deck)} onDelete={() => handleDelete(deck)} />
          ))}
        </div>
      )}

      {editing && (
        <DeckModal
          subjectId={id}
          deck={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setReloadKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}
