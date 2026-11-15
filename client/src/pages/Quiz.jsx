import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { generateQuiz, getQuizAttempt, getQuizHistory, submitQuiz } from '../api/quiz.js'
import { getDeck } from '../api/decks.js'
import { cardClass, primaryBtn, secondaryBtn } from '../components/PageHeader.jsx'
import { AnswerReview, ScorePill, ScoreRing } from '../components/QuizParts.jsx'
import { QuizIcon, SparkIcon } from '../components/Icons.jsx'
import { formatWhen, scoreTone } from '../utils/quiz.js'

const COUNTS = [5, 10]

function errorText(err, fallback) {
  return err.response?.data?.details?.[0]?.message || err.response?.data?.error || fallback
}

// Score banner shown after a quiz and when reviewing a past one
function ResultBanner({ score, total, when, onAgain, onBack }) {
  const percent = Math.round((score / total) * 100)
  return (
    <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#5546d6] p-7 text-white shadow-xl shadow-indigo-900/15">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreRing score={score} total={total} />
        <div className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">{when ? 'Quiz review' : 'Quiz complete'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{scoreTone(percent).label}{percent >= 80 ? '! 🎉' : ''}</h2>
          <p className="mt-1 text-sm text-indigo-100/80">
            You got {score} of {total} right{when ? ` · ${formatWhen(when)}` : ''}. Cards you missed are worth another look in study mode.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <button type="button" onClick={onAgain} className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-indigo-900 hover:bg-indigo-50">
              New quiz
            </button>
            <button type="button" onClick={onBack} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/15">
              Back to history
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// One deck's quiz: choose 5 or 10 questions, answer them, see the score.
// The start screen lists this deck's past quizzes; ?attempt=<id> opens one for review.
export default function Quiz() {
  const { deckId } = useParams()
  const [params, setParams] = useSearchParams()
  const reviewId = params.get('attempt')

  const [deck, setDeck] = useState(null)
  const [history, setHistory] = useState(null)
  const [count, setCount] = useState(5)
  const [quiz, setQuiz] = useState(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null) // { score, total, results, createdAt? }
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)

  useEffect(() => {
    getDeck(deckId).then(setDeck).catch(() => setDeck({ name: 'Deck' }))
  }, [deckId])

  useEffect(() => {
    getQuizHistory(deckId)
      .then((list) => setHistory(list.filter((h) => h.score !== null)))
      .catch(() => setHistory([]))
  }, [deckId, historyKey])

  // Open a past quiz when the URL has ?attempt=<id>
  useEffect(() => {
    if (!reviewId) return
    getQuizAttempt(reviewId)
      .then((data) => {
        setQuiz(null)
        setResult(data)
      })
      .catch((err) => {
        toast.error(errorText(err, 'Could not open that quiz.'))
        setParams({}, { replace: true })
      })
  }, [reviewId, setParams])

  async function start() {
    setLoading(true)
    setResult(null)
    setParams({}, { replace: true })
    try {
      const data = await generateQuiz(deckId, count)
      setQuiz(data)
      setAnswers(Array(data.total).fill(null))
      setIndex(0)
    } catch (err) {
      toast.error(errorText(err, 'Could not make the quiz. Please try again.'), { duration: 6000 })
    } finally {
      setLoading(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    try {
      const data = await submitQuiz(quiz._id, answers)
      setResult(data)
      setQuiz(null)
      setHistoryKey((k) => k + 1) // the new score shows up in the history
    } catch (err) {
      toast.error(errorText(err, 'Could not submit. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  function backToHistory() {
    setResult(null)
    setQuiz(null)
    setParams({}, { replace: true })
  }

  const header = (
    <div className="mb-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link to="/quiz" className="hover:text-slate-900">AI Quiz</Link>
        <span>›</span>
        <span className="font-medium text-slate-700">{deck?.name ?? '…'}</span>
      </nav>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500">{deck?.subjectName ?? 'Deck'} · AI quiz</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight text-slate-900">{deck?.name ?? 'Quiz'}</h1>
    </div>
  )

  // AI is writing the questions
  if (loading) {
    return (
      <div>
        {header}
        <div className={`${cardClass} px-6 py-16 text-center`}>
          <span className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-violet text-white">
            <SparkIcon className="h-7 w-7" />
          </span>
          <p className="mt-5 text-lg font-semibold text-slate-900">Making your quiz…</p>
          <p className="mt-1 text-sm text-slate-500">AI is writing {count} questions from this deck. This takes 10–30 seconds.</p>
        </div>
      </div>
    )
  }

  // Score and answer review (just finished, or a past quiz)
  if (result) {
    return (
      <div className="space-y-6">
        {header}
        <ResultBanner score={result.score} total={result.total} when={reviewId ? result.createdAt : null} onAgain={start} onBack={backToHistory} />
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Answer review</p>
          <AnswerReview results={result.results} />
        </div>
      </div>
    )
  }

  // Answering, one question at a time
  if (quiz) {
    const q = quiz.questions[index]
    const last = index === quiz.total - 1
    const answered = answers.filter((a) => a !== null).length
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Question {index + 1} of {quiz.total}</span>
          <span>{answered} answered</span>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-linear-to-r from-brand-500 to-brand-violet transition-all" style={{ width: `${((index + 1) / quiz.total) * 100}%` }} />
        </div>
        <div className={`${cardClass} p-6`}>
          <p className="text-lg font-medium text-slate-900">{q.question}</p>
          <div className="mt-5 space-y-2.5">
            {q.options.map((option, i) => {
              const selected = answers[index] === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAnswers((list) => list.map((a, n) => (n === index ? i : a)))}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] transition ${
                    selected ? 'border-brand-500 bg-indigo-50 text-indigo-900 ring-4 ring-indigo-100' : 'border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 text-slate-500'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </button>
              )
            })}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => setIndex((i) => i - 1)} disabled={index === 0} className={secondaryBtn}>← Previous</button>
          {last ? (
            <button type="button" onClick={submit} disabled={submitting || answers.includes(null)} className={`${primaryBtn} px-5 py-2.5`}>
              {submitting ? 'Submitting…' : 'Submit quiz'}
            </button>
          ) : (
            <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={answers[index] === null} className={`${primaryBtn} px-5 py-2.5`}>Next →</button>
          )}
        </div>
      </div>
    )
  }

  // Start screen with this deck's history
  const best = history?.length ? Math.max(...history.map((h) => Math.round((h.score / h.total) * 100))) : null
  return (
    <div>
      {header}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className={`${cardClass} p-6`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-brand-500"><QuizIcon /></span>
          <h2 className="mt-4 text-xl font-medium tracking-tight text-slate-900">Start a new quiz</h2>
          <p className="mt-1 text-sm text-slate-500">AI writes multiple-choice questions from the cards in this deck.</p>
          <p className="mb-2 mt-5 text-[13px] font-medium text-slate-700">Number of questions</p>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                aria-pressed={count === n}
                className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${count === n ? 'bg-white text-brand-500 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {n} questions
              </button>
            ))}
          </div>
          <button type="button" onClick={start} className={`${primaryBtn} mt-5 w-full py-3`}>
            <SparkIcon className="h-4 w-4" /> Start quiz
          </button>
        </section>

        <section className={`${cardClass} p-6`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quiz history</p>
              <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">Past attempts</h2>
            </div>
            {best !== null && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-brand-500">Best {best}%</span>}
          </div>
          {!history && <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />}
          {history?.length === 0 && <p className="mt-6 text-sm text-slate-500">No quizzes yet. Your scores will appear here.</p>}
          <ul className="mt-4 divide-y divide-slate-100">
            {history?.map((h, i) => (
              <li key={h._id}>
                <button type="button" onClick={() => setParams({ attempt: h._id })} className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80">
                  <span className="w-7 text-xs text-slate-400">#{history.length - i}</span>
                  <span className="flex-1 text-[13px] text-slate-700">{formatWhen(h.createdAt)}</span>
                  <ScorePill score={h.score} total={h.total} />
                  <span className="hidden text-xs font-medium text-brand-500 sm:inline">Review →</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
