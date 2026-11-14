import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSubjects } from '../api/dashboard.js'
import { getDecks } from '../api/decks.js'
import PageHeader, { cardClass, primaryBtn } from '../components/PageHeader.jsx'
import { QuizIcon } from '../components/Icons.jsx'

const MIN_CARDS = 4 // the quiz API needs at least 4 cards

// AI Quiz: pick a deck, then the existing quiz page (/decks/:id/quiz) runs the quiz
export default function QuizPicker() {
  const [groups, setGroups] = useState(null) // [{ subject, decks }]
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listSubjects({ signal: controller.signal })
      .then((subjects) => Promise.all(subjects.map(async (subject) => ({ subject, decks: await getDecks(subject._id) }))))
      .then((list) => setGroups(list.filter((g) => g.decks.length > 0)))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Could not load your decks.')
      })
    return () => controller.abort()
  }, [])

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

      <div className="space-y-6">
        {groups?.map(({ subject, decks }) => (
          <section key={subject._id}>
            <h2 className="mb-2 text-[13px] font-semibold text-slate-700">{subject.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => {
                const ready = (deck.cardCount ?? 0) >= MIN_CARDS
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
