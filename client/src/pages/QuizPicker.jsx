import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSubjects } from '../api/dashboard.js'
import { getDecks } from '../api/decks.js'
import { getRecentQuizzes } from '../api/quiz.js'
import { ScorePill } from '../components/QuizParts.jsx'
import { formatWhen } from '../utils/quiz.js'
import PageHeader, { cardClass, primaryBtn } from '../components/PageHeader.jsx'
import { QuizIcon } from '../components/Icons.jsx'

const MIN_CARDS = 4 // the quiz API needs at least 4 cards

// AI Quiz: pick a deck, then the existing quiz page (/decks/:id/quiz) runs the quiz
export default function QuizPicker() {
  const [groups, setGroups] = useState(null) // [{ subject, decks }]
  const [error, setError] = useState('')
  const [recent, setRecent] = useState(null) // submitted quizzes, newest first

  useEffect(() => {
    const controller = new AbortController()
    listSubjects({ signal: controller.signal })
      .then((subjects) => Promise.all(subjects.map(async (subject) => ({ subject, decks: await getDecks(subject._id) }))))
      .then((list) => setGroups(list.filter((g) => g.decks.length > 0)))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Could not load your decks.')
      })
    getRecentQuizzes({ limit: 50, signal: controller.signal })
      .then(setRecent)
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setRecent([])
      })
    return () => controller.abort()
  }, [])

  // Last and best score per deck, from the recent list
  const deckScores = new Map()
  for (const q of recent ?? []) {
    const id = String(q.deckId)
    const entry = deckScores.get(id)
    if (!entry) deckScores.set(id, { last: q, best: q })
    else if (q.percent > entry.best.percent) entry.best = q
  }

  return (
    <div>
      <PageHeader eyebrow="Test yourself" title="AI Quiz" subtitle="Pick a deck and AI writes a multiple-choice quiz from its cards." />

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!groups && !error && <div className={`${cardClass} h-40 animate-pulse`} />}

      {groups?.length === 0 && (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <p className="text-sm text-slate-500">You need a deck with at least {MIN_CARDS} cards to make a quiz.</p>
          <Link to="/subjects" className={`${primaryBtn} mt-4`}>
            Go to my subjects
          </Link>
        </div>
      )}

      {recent?.length > 0 && (
        <section className={`${cardClass} mb-6 p-6`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quiz history</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">Recent quizzes</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.slice(0, 5).map((q) => (
              <li key={q._id}>
                <Link to={`/decks/${q.deckId}/quiz?attempt=${q._id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand-500">
                    <QuizIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-slate-900">{q.deckName}</span>
                    <span className="block truncate text-xs text-slate-500">{q.subjectName} · {formatWhen(q.createdAt)}</span>
                  </span>
                  <ScorePill score={q.score} total={q.total} />
                  <span className="hidden text-xs font-medium text-brand-500 sm:inline">Review →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-6">
        {groups?.map(({ subject, decks }) => (
          <section key={subject._id}>
            <h2 className="mb-2 text-[13px] font-semibold text-slate-700">{subject.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => {
                const ready = (deck.cardCount ?? 0) >= MIN_CARDS
                const scores = deckScores.get(String(deck._id))
                return (
                  <div key={deck._id} className={`${cardClass} flex items-center gap-3 p-4`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand-500">
                      <QuizIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{deck.name}</p>
                      <p className="text-xs text-slate-500">
                        {deck.cardCount ?? 0} cards{!ready && ` · needs ${MIN_CARDS}+`}
                      </p>
                      {scores && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Last {scores.last.score}/{scores.last.total} · Best {scores.best.score}/{scores.best.total}
                        </p>
                      )}
                    </div>
                    {ready ? (
                      <Link to={`/decks/${deck._id}/quiz`} className={primaryBtn}>
                        Quiz me
                      </Link>
                    ) : (
                      <Link to={`/subjects/${subject._id}/decks/${deck._id}`} className="text-xs font-medium text-brand-500 hover:underline">
                        Add cards
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
