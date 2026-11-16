import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getDueCards, reviewCard } from '../api/study.js'
import { formatInterval, nextInterval } from '../utils/sm2.js'
import PageHeader, { cardClass, primaryBtn, secondaryBtn } from '../components/PageHeader.jsx'
import { CheckIcon, SparkIcon } from '../components/Icons.jsx'

// The four answer buttons. key = keyboard shortcut.
const RATINGS = [
  { value: 'again', label: 'Again', key: '1', dot: 'bg-rose-500', style: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300' },
  { value: 'hard', label: 'Hard', key: '2', dot: 'bg-amber-500', style: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300' },
  { value: 'good', label: 'Good', key: '3', dot: 'bg-emerald-500', style: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300' },
  { value: 'easy', label: 'Easy', key: '4', dot: 'bg-sky-500', style: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300' },
]

const EMPTY_TALLY = { again: 0, hard: 0, good: 0, easy: 0 }

function Kbd({ children, className = '' }) {
  return (
    <kbd className={`inline-flex min-w-5 items-center justify-center rounded border border-slate-300 bg-white px-1 font-mono text-[10px] font-semibold text-slate-500 shadow-[0_1px_0_rgb(203_213_225)] ${className}`}>
      {children}
    </kbd>
  )
}

function Shell({ children }) {
  return <div className="mx-auto w-full max-w-3xl">{children}</div>
}

const header = <PageHeader eyebrow="Study space" title="Study mode" subtitle="Cards due today, picked by spaced repetition." />

function CenterMessage({ icon, title, text, children }) {
  return (
    <Shell>
      {header}
      <div className={`${cardClass} px-6 py-14 text-center`}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-violet text-white shadow-lg shadow-indigo-500/25">
          {icon}
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </Shell>
  )
}

function Summary({ tally, onAgain }) {
  const total = Object.values(tally).reduce((a, b) => a + b, 0)
  const remembered = tally.hard + tally.good + tally.easy
  const score = total ? Math.round((remembered / total) * 100) : 0

  return (
    <Shell>
      {header}
      <section className="rounded-3xl bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#5546d6] p-7 text-center text-white shadow-xl shadow-indigo-900/15 sm:text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Session complete</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Nice work! 🎉</h2>
        <p className="mt-1 text-sm text-indigo-100/80">
          You reviewed {total} {total === 1 ? 'card' : 'cards'} and remembered {score}% of them. Cards you found hard will come back sooner.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((r) => (
            <div key={r.value} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-200">
                <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
                {r.label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{tally[r.value]}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Link to="/" className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-indigo-900 hover:bg-indigo-50">
            Back to dashboard
          </Link>
          <button type="button" onClick={onAgain} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/15">
            Check for more cards
          </button>
        </div>
      </section>
    </Shell>
  )
}

function FlipCard({ card, flipped, onFlip }) {
  return (
    <div className="flip-scene">
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Answer shown' : 'Show answer'}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onFlip()
        }}
        className={`flip-card relative h-80 w-full cursor-pointer select-none sm:h-96 ${flipped ? 'is-flipped' : ''}`}
      >
        {/* Front: the question */}
        <div className="flip-face absolute inset-0 flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-brand-500">{card.deckName || 'Deck'}</span>
            {card.isNewCard && (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">New</span>
            )}
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Question</p>
          <div className="flex flex-1 items-center justify-center overflow-y-auto py-4">
            <p className="whitespace-pre-wrap text-center text-xl font-medium leading-relaxed tracking-tight text-slate-900 sm:text-2xl">{card.front}</p>
          </div>
          <p className="text-center text-xs text-slate-400">
            Tap the card or press <Kbd>Space</Kbd> to see the answer
          </p>
        </div>

        {/* Back: the answer */}
        <div className="flip-face flip-back absolute inset-0 flex flex-col rounded-3xl bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#5546d6] p-6 text-white shadow-xl shadow-indigo-900/20 sm:p-8">
          <p className="line-clamp-2 border-b border-white/10 pb-3 text-sm text-indigo-200">{card.front}</p>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">Answer</p>
          <div className="flex flex-1 items-center justify-center overflow-y-auto py-3">
            <p className="whitespace-pre-wrap text-center text-lg leading-relaxed sm:text-xl">{card.back}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// F7: study today's due cards one by one. /study, /study?deckId=..., /study?subjectId=...
export default function Study() {
  const [params] = useSearchParams()
  const deckId = params.get('deckId')
  const subjectId = params.get('subjectId')

  const [queue, setQueue] = useState(null) // null while loading
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tally, setTally] = useState(EMPTY_TALLY)
  const [doneToday, setDoneToday] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getDueCards({ deckId, subjectId, signal: controller.signal })
      .then((data) => {
        setQueue(data.cards)
        setDoneToday(data.doneToday)
        setIndex(0)
        setFlipped(false)
        setTally(EMPTY_TALLY)
        setError('')
      })
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError(err.response?.data?.error || 'Could not load your cards.')
      })
    return () => controller.abort()
  }, [deckId, subjectId, reloadKey])

  function reload() {
    setQueue(null)
    setError('')
    setReloadKey((k) => k + 1)
  }

  const card = queue?.[index]

  const flip = useCallback(() => setFlipped((f) => !f), [])

  const rate = useCallback(
    async (rating) => {
      if (!card || !flipped || saving) return
      setSaving(true)
      try {
        await reviewCard(card._id, rating)
        setTally((t) => ({ ...t, [rating]: t[rating] + 1 }))
        setFlipped(false)
        setIndex((i) => i + 1)
      } catch (err) {
        if (err.response?.status === 409) {
          // Already rated (e.g. in another tab): just move on
          setFlipped(false)
          setIndex((i) => i + 1)
        } else {
          toast.error(err.response?.data?.error || 'Could not save your answer. Try again.')
        }
      } finally {
        setSaving(false)
      }
    },
    [card, flipped, saving],
  )

  // Keyboard: Space/Enter flips, 1-4 rates once the answer is showing
  useEffect(() => {
    function onKey(e) {
      if (!card || e.target.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === ' ' || (e.key === 'Enter' && e.target === document.body)) {
        e.preventDefault()
        flip()
        return
      }
      const r = RATINGS.find((x) => x.key === e.key)
      if (r && flipped) rate(r.value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, flipped, flip, rate])

  if (error) {
    return (
      <CenterMessage icon={<SparkIcon className="h-7 w-7" />} title="Something went wrong" text={error}>
        <button type="button" onClick={reload} className={primaryBtn}>
          Try again
        </button>
      </CenterMessage>
    )
  }

  if (queue === null) {
    return (
      <Shell>
        {header}
        <div className="mb-6 h-2 animate-pulse rounded-full bg-slate-200" />
        <div className="h-80 animate-pulse rounded-3xl bg-slate-200/70 sm:h-96" />
      </Shell>
    )
  }

  if (queue.length === 0) {
    const studied = (doneToday?.review ?? 0) + (doneToday?.new ?? 0)
    return (
      <CenterMessage
        icon={studied ? <CheckIcon className="h-7 w-7" /> : <SparkIcon className="h-7 w-7" />}
        title={studied ? 'All caught up for today!' : 'Nothing to study yet'}
        text={
          studied
            ? `You have reviewed ${studied} ${studied === 1 ? 'card' : 'cards'} today. Your next cards will be ready tomorrow.`
            : 'Add some cards to a deck and they will show up here, ready to study.'
        }
      >
        <Link to="/subjects" className={primaryBtn}>
          {studied ? 'Go to my subjects' : 'Add cards'}
        </Link>
        {studied > 0 && (
          <Link to="/quiz" className={secondaryBtn}>
            Take a quiz
          </Link>
        )}
      </CenterMessage>
    )
  }

  if (!card) return <Summary tally={tally} onAgain={reload} />

  const progress = Math.round((index / queue.length) * 100)
  const scope = deckId || subjectId ? card.deckName || 'This deck' : 'All subjects'

  return (
    <Shell>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-900">Dashboard</Link>
        <span>›</span>
        <span className="font-medium text-slate-700">Study mode</span>
      </nav>
      <div className="mb-5 mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500">Study space · {scope}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Card {index + 1} <span className="font-normal text-slate-400">of {queue.length}</span>
          </h1>
        </div>
        <Link to="/" className={secondaryBtn}>
          Exit session
        </Link>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-linear-to-r from-brand-500 to-brand-violet transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* key: a new card mounts unflipped, so its answer never shows during the flip back */}
      <FlipCard key={card._id} card={card} flipped={flipped} onFlip={flip} />

      <div className="mt-6 min-h-24">
        {flipped ? (
          <>
            <p className="mb-3 text-center text-xs font-medium text-slate-500">How well did you remember it?</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  disabled={saving}
                  onClick={() => rate(r.value)}
                  className={`group rounded-2xl border px-3 py-3 text-center transition disabled:cursor-wait disabled:opacity-60 ${r.style}`}
                >
                  <span className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                    {r.label}
                    <Kbd className="hidden sm:inline-flex">{r.key}</Kbd>
                  </span>
                  <span className="mt-0.5 block text-[11px] opacity-80">{formatInterval(nextInterval(card, r.value))}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <button type="button" onClick={flip} className={`${primaryBtn} w-full py-3.5 text-sm`}>
            Show answer
            <Kbd className="hidden border-white/30 bg-white/15 text-white shadow-none sm:inline-flex">Space</Kbd>
          </button>
        )}
      </div>
    </Shell>
  )
}
