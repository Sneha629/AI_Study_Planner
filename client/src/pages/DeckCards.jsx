import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createCard, deleteCard, getCards, updateCard } from '../api/cards.js'
import { getDeck, shareDeck, unshareDeck } from '../api/decks.js'
import { cardClass, primaryBtn, secondaryBtn } from '../components/PageHeader.jsx'
import Modal, { fieldLabel, fieldTextarea } from '../components/Modal.jsx'
import { EditIcon, IconButton, TrashIcon } from '../components/IconButtons.jsx'
import { PlayIcon, QuizIcon, SearchIcon, ShareIcon, SparkIcon } from '../components/Icons.jsx'

const MIN_QUIZ_CARDS = 4

// A card's status from its spaced-repetition data
const STATUSES = {
  mastered: { label: 'Mastered', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  learning: { label: 'Learning', className: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  review: { label: 'Needs review', className: 'bg-rose-50 text-rose-600', dot: 'bg-rose-500' },
  new: { label: 'New', className: 'bg-indigo-50 text-brand-500', dot: 'bg-brand-500' },
}

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusOf(card, today) {
  if (card.isNewCard) return 'new'
  if (card.intervalDays >= 21) return 'mastered'
  if (card.dueDate <= today) return 'review'
  return 'learning'
}

const SORTS = {
  recent: { label: 'Recently added', fn: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
  oldest: { label: 'Oldest first', fn: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') },
  alpha: { label: 'Question A–Z', fn: (a, b) => a.front.localeCompare(b.front) },
}

function lastStudied(iso) {
  if (!iso) return 'Not studied yet'
  const at = new Date(iso)
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((start(new Date()) - start(at)) / 86400000)
  const time = at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  if (days <= 0) return `Last studied today at ${time}`
  if (days === 1) return `Last studied yesterday at ${time}`
  return `Last studied ${days} days ago`
}

function errorText(err, fallback) {
  return err.response?.data?.details?.[0]?.message || err.response?.data?.error || fallback
}

function CardModal({ deckId, card, onClose, onSaved }) {
  const editing = Boolean(card?._id)
  const [front, setFront] = useState(card?.front ?? '')
  const [back, setBack] = useState(card?.back ?? '')
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return toast.error('Both question and answer are needed.')
    setSaving(true)
    try {
      const saved = editing ? await updateCard(card._id, front.trim(), back.trim()) : await createCard(deckId, front.trim(), back.trim())
      toast.success(editing ? 'Card updated' : 'Card added')
      onSaved(saved, editing)
    } catch (err) {
      toast.error(errorText(err, 'Could not save the card.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} icon={<SparkIcon />} title={editing ? 'Edit card' : 'Add a new card'} subtitle="Write one clear question and a short answer.">
      <form onSubmit={save} className="space-y-4" noValidate>
        <div>
          <label htmlFor="c-front" className={fieldLabel}>Question</label>
          <textarea id="c-front" rows={2} maxLength={500} value={front} onChange={(e) => setFront(e.target.value)} placeholder="e.g. State Newton's first law of motion." className={fieldTextarea} />
        </div>
        <div>
          <label htmlFor="c-back" className={fieldLabel}>Answer</label>
          <textarea id="c-back" rows={4} maxLength={2000} value={back} onChange={(e) => setBack(e.target.value)} placeholder="The answer the student should remember" className={fieldTextarea} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryBtn}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add card'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ProgressRing({ percent }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-16 w-16">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#5eead4" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{percent}%</span>
    </div>
  )
}

// Deck page (Figma design): progress banner, actions and the card library
export default function DeckCards() {
  const { id: subjectId, deckId } = useParams()
  const navigate = useNavigate()
  const [deck, setDeck] = useState(null)
  const [cards, setCards] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [editing, setEditing] = useState(null) // null | {} | card
  const [shareBusy, setShareBusy] = useState(false)
  const today = todayLocal()

  useEffect(() => {
    Promise.all([getDeck(deckId), getCards(deckId)])
      .then(([d, list]) => {
        setDeck(d)
        setCards(Array.isArray(list) ? list : [])
      })
      .catch((err) => setError(err.response?.status === 404 ? 'Deck not found.' : 'Could not load this deck.'))
  }, [deckId])

  const shown = useMemo(() => {
    if (!cards) return []
    const q = query.trim().toLowerCase()
    return cards
      .map((c) => ({ ...c, status: statusOf(c, today) }))
      .filter((c) => !q || c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q))
      .filter((c) => filter === 'all' || c.status === filter || c.source === filter)
      .sort(SORTS[sort].fn)
  }, [cards, query, filter, sort, today])

  // Counts from the cards on screen, so they update right after an add or delete
  const total = cards?.length ?? 0
  const mastered = cards?.filter((c) => statusOf(c, today) === 'mastered').length ?? 0
  const due = cards?.filter((c) => c.dueDate <= today).length ?? 0
  const learned = cards?.filter((c) => !c.isNewCard).length ?? 0
  const progress = total ? Math.round((learned / total) * 100) : 0

  async function handleDelete(card) {
    if (!window.confirm('Delete this card? Its review history will be deleted too.')) return
    try {
      await deleteCard(card._id)
      setCards((list) => list.filter((c) => c._id !== card._id))
      toast.success('Card deleted')
    } catch (err) {
      toast.error(errorText(err, 'Could not delete the card.'))
    }
  }

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied')
    } catch {
      toast(url, { duration: 8000, icon: '🔗' })
    }
  }

  async function toggleShare() {
    setShareBusy(true)
    try {
      if (deck.shared) {
        if (!window.confirm('Stop sharing this deck? The old link will stop working.')) return
        await unshareDeck(deckId)
        setDeck((d) => ({ ...d, shared: false }))
        toast.success('Sharing turned off')
      } else {
        const { shareUrl } = await shareDeck(deckId)
        setDeck((d) => ({ ...d, shared: true }))
        await copy(shareUrl)
      }
    } catch (err) {
      toast.error(errorText(err, 'Could not change sharing.'))
    } finally {
      setShareBusy(false)
    }
  }

  async function copyExistingLink() {
    try {
      const { shareUrl } = await shareDeck(deckId) // returns the existing link
      await copy(shareUrl)
    } catch (err) {
      toast.error(errorText(err, 'Could not get the link.'))
    }
  }

  if (error) {
    return (
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <p className="text-sm text-slate-500">{error}</p>
        <Link to={`/subjects/${subjectId}`} className={`${secondaryBtn} mt-4`}>Back to the subject</Link>
      </div>
    )
  }
  if (!deck || !cards) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="h-28 animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    )
  }

  const selectClass = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-brand-500'

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link to="/subjects" className="hover:text-slate-900">My Subjects</Link>
        <span>›</span>
        <Link to={`/subjects/${subjectId}`} className="hover:text-slate-900">{deck.subjectName}</Link>
        <span>›</span>
        <span className="font-medium text-slate-700">{deck.name}</span>
      </nav>

      <div className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{deck.subjectName} · Flashcard deck</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight text-slate-900">{deck.name}</h1>
          {deck.description && <p className="mt-1 text-sm text-slate-500">{deck.description}</p>}
        </div>
        <button type="button" onClick={() => setEditing({})} className={`${primaryBtn} px-5 py-2.5`}>+ Add new card</button>
      </div>

      {/* Deck progress banner */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#4c3fc4] p-6 text-white shadow-xl shadow-indigo-900/15">
        <div className="grid grid-cols-3 items-center gap-6 md:grid-cols-[1.6fr_repeat(3,1fr)_auto]">
          <div className="col-span-3 flex items-center gap-4 md:col-span-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Deck progress</p>
              <p className="text-lg font-medium">Build lasting recall.</p>
              <p className="text-[11px] text-indigo-200">
                {total === 0 ? 'Add cards to get started.' : total === mastered ? 'Every card in this deck is mastered. 🎉' : `You're ${total - mastered} cards away from mastering this deck.`}
              </p>
            </div>
          </div>
          {[
            ['Total cards', total, 'text-white'],
            ['Mastered', mastered, 'text-white'],
            ['Due for review', due, 'text-amber-300'],
          ].map(([label, value, color]) => (
            <div key={label} className="border-white/10 md:border-l md:pl-6">
              <p className="text-[10px] text-indigo-200">{label}</p>
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            </div>
          ))}
          <div className="col-span-3 flex flex-col items-center md:col-span-1">
            <ProgressRing percent={progress} />
            <p className="mt-1 text-[10px] text-indigo-200">Study progress</p>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className={`${cardClass} mt-4 flex flex-wrap items-center gap-2 p-3`}>
        <button type="button" onClick={() => navigate(`/study?deckId=${deckId}`)} disabled={total === 0} className={`${primaryBtn} px-5 py-2.5`}>
          <PlayIcon className="h-3.5 w-3.5" /> Study this deck
        </button>
        <button
          type="button"
          onClick={() => navigate(`/decks/${deckId}/quiz`)}
          disabled={total < MIN_QUIZ_CARDS}
          title={total < MIN_QUIZ_CARDS ? `Needs at least ${MIN_QUIZ_CARDS} cards` : undefined}
          className={`${secondaryBtn} py-2.5`}
        >
          <QuizIcon className="h-4 w-4" /> Quiz me
        </button>
        <button type="button" onClick={toggleShare} disabled={shareBusy} className={`${secondaryBtn} py-2.5`}>
          <ShareIcon className="h-4 w-4" /> {deck.shared ? 'Stop sharing' : 'Share deck'}
        </button>
        {deck.shared && (
          <button type="button" onClick={copyExistingLink} className="px-2 text-xs font-medium text-brand-500 hover:underline">Copy link</button>
        )}
        <p className="ml-auto text-[11px] text-slate-400">{lastStudied(deck.lastStudiedAt)}</p>
      </div>

      {/* Card library */}
      <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Card library</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">Flashcards <span className="text-sm text-slate-400">{total}</span></h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 w-56 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm focus-within:border-brand-500">
            <SearchIcon className="h-4 w-4" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cards…" aria-label="Search cards" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter" className={selectClass}>
            <option value="all">All cards</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            <option value="ai">AI generated</option>
            <option value="manual">Manual</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className={selectClass}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {total === 0 ? (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <p className="text-sm text-slate-500">No cards in this deck yet.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => setEditing({})} className={primaryBtn}>+ Add new card</button>
            <Link to={`/subjects/${subjectId}/notes`} className={secondaryBtn}>Make cards from notes</Link>
          </div>
        </div>
      ) : (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="hidden grid-cols-[2.5rem_1.2fr_1.5fr_8rem_8rem_5rem] gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 md:grid">
            <span />
            <span>Question</span>
            <span>Answer</span>
            <span>Source</span>
            <span>Status</span>
            <span />
          </div>
          {shown.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No cards match.</p>}
          <ul className="divide-y divide-slate-100">
            {shown.map((card, i) => {
              const status = STATUSES[card.status]
              return (
                <li key={card._id} className="grid gap-2 px-5 py-4 md:grid-cols-[2.5rem_1.2fr_1.5fr_8rem_8rem_5rem] md:items-center md:gap-4">
                  <span className="hidden text-xs text-slate-400 md:block">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-[13px] font-medium text-slate-900">{card.front}</p>
                  <p className="text-xs text-slate-500">{card.back}</p>
                  <span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${card.source === 'ai' ? 'bg-indigo-50 text-brand-500' : 'bg-slate-100 text-slate-600'}`}>
                      {card.source === 'ai' && <SparkIcon className="h-3 w-3" />}
                      {card.source === 'ai' ? 'AI Generated' : 'Manual'}
                    </span>
                  </span>
                  <span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </span>
                  <span className="flex gap-1.5 md:justify-end">
                    <IconButton label="Edit card" onClick={() => setEditing(card)}><EditIcon /></IconButton>
                    <IconButton label="Delete card" onClick={() => handleDelete(card)} danger><TrashIcon /></IconButton>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {editing && (
        <CardModal
          deckId={deckId}
          card={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, wasEdit) => {
            setEditing(null)
            setCards((list) => (wasEdit ? list.map((c) => (c._id === saved._id ? saved : c)) : [saved, ...list]))
          }}
        />
      )}
    </div>
  )
}
