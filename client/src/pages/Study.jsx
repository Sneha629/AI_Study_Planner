import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getDueCards, reviewCard } from '../api/study.js'
import { formatInterval, nextInterval } from '../utils/sm2.js'

// The four answer buttons. key = keyboard shortcut.
const RATINGS = [
  { value: 'again', label: 'Again', key: '1', hint: 'Forgot it', style: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300' },
  { value: 'hard', label: 'Hard', key: '2', hint: 'Struggled', style: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300' },
  { value: 'good', label: 'Good', key: '3', hint: 'Got it', style: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300' },
  { value: 'easy', label: 'Easy', key: '4', hint: 'Too easy', style: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300' },
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
  return <div className="mx-auto w-full max-w-2xl">{children}</div>
}

function CenterMessage({ emoji, title, text, children }) {
  return (
    <Shell>
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="text-5xl">{emoji}</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </Shell>
  )
}

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-700'
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'

function Summary({ tally, onAgain }) {
  const total = Object.values(tally).reduce((a, b) => a + b, 0)
  const remembered = tally.hard + tally.good + tally.easy
  const score = total ? Math.round((remembered / total) * 100) : 0

  return (
    <Shell>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-linear-to-br from-indigo-500 to-violet-600 px-6 py-10 text-center text-white">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 text-2xl font-bold">Session complete!</h1>
          <p className="mt-1 text-sm text-indigo-100">
            You reviewed {total} {total === 1 ? 'card' : 'cards'} and remembered {score}% of them.
          </p>
        </div>

        <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
          {RATINGS.map((r) => (
            <div key={r.value} className="px-2 py-5 text-center">
              <p className="text-2xl font-bold text-slate-900">{tally[r.value]}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{r.label}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-6 text-center">
          <p className="text-sm text-slate-500">
            Cards you found hard will come back sooner. Come back tomorrow to keep your memory fresh.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onAgain} className={secondaryBtn}>
              Check for more cards
            </button>
            <Link to="/" className={primaryBtn}>
              Back to home
            </Link>
          </div>
        </div>
      </div>
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
        <div className="flip-face absolute inset-0 flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {card.deckName || 'Deck'}
            </span>
            {card.isNewCard && (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                New
              </span>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center overflow-y-auto py-4">
            <p className="whitespace-pre-wrap text-center text-xl font-semibold leading-relaxed text-slate-900 sm:text-2xl">
              {card.front}
            </p>
          </div>
          <p className="text-center text-xs text-slate-400">
            Tap the card or press <Kbd>Space</Kbd> to see the answer
          </p>
        </div>

        {/* Back: the answer */}
        <div className="flip-face flip-back absolute inset-0 flex flex-col rounded-3xl border border-indigo-100 bg-linear-to-br from-white to-indigo-50/60 p-6 shadow-xl shadow-indigo-900/5 sm:p-8">
          <p className="line-clamp-2 border-b border-indigo-100 pb-3 text-sm text-slate-500">{card.front}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-indigo-500">Answer</p>
          <div className="flex flex-1 items-center justify-center overflow-y-auto py-3">
            <p className="whitespace-pre-wrap text-center text-lg leading-relaxed text-slate-800 sm:text-xl">
              {card.back}
            </p>
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
      <CenterMessage emoji="😕" title="Something went wrong" text={error}>
        <button type="button" onClick={reload} className={primaryBtn}>
          Try again
        </button>
      </CenterMessage>
    )
  }

  if (queue === null) {
    return (
      <Shell>
        <div className="mb-6 h-2 animate-pulse rounded-full bg-slate-200" />
        <div className="h-80 animate-pulse rounded-3xl bg-slate-200/70 sm:h-96" />
      </Shell>
    )
  }

  if (queue.length === 0) {
    const studied = (doneToday?.review ?? 0) + (doneToday?.new ?? 0)
    return (
      <CenterMessage
        emoji={studied ? '🌟' : '📭'}
        title={studied ? "All caught up for today!" : 'Nothing to study yet'}
        text={
          studied
            ? `You have reviewed ${studied} ${studied === 1 ? 'card' : 'cards'} today. Your next cards will be ready tomorrow.`
            : 'Add some cards to a deck and they will show up here, ready to study.'
        }
      >
        <Link to="/subjects" className={primaryBtn}>
          {studied ? 'Go to subjects' : 'Add cards'}
        </Link>
      </CenterMessage>
    )
  }

  if (!card) return <Summary tally={tally} onAgain={reload} />

  const progress = Math.round((index / queue.length) * 100)

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <span aria-hidden="true">←</span> Exit
        </Link>
        <p className="text-sm font-semibold text-slate-700">
          {index + 1} <span className="font-normal text-slate-400">/ {queue.length}</span>
        </p>
      </div>

      <div
        className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
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
                  <span className="flex items-center justify-center gap-1.5 text-sm font-bold">
                    {r.label}
                    <Kbd className="hidden sm:inline-flex">{r.key}</Kbd>
                  </span>
                  <span className="mt-0.5 block text-[11px] opacity-80">{formatInterval(nextInterval(card, r.value))}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <button type="button" onClick={flip} className={`${primaryBtn} w-full py-3.5 text-base`}>
            Show answer
            <Kbd className="hidden border-indigo-400 bg-indigo-500 text-indigo-100 shadow-none sm:inline-flex">Space</Kbd>
          </button>
        )}
      </div>
    </Shell>
  )
}
