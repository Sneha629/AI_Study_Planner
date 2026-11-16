import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getSharedDeck, copySharedDeck } from '../api/decks.js'
import api from '../api/client.js'
import { BrandLogo } from '../components/AuthLayout.jsx'
import { cardClass, primaryBtn, secondaryBtn } from '../components/PageHeader.jsx'
import { ShareIcon } from '../components/Icons.jsx'

const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.18em]'

// Public page for a shared deck link (/shared/:token). Anyone can read the cards;
// logged-in users can copy the deck into one of their subjects.
export default function SharedDeck() {
  const { token } = useParams()

  const [deck, setDeck] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const isLoggedIn = Boolean(localStorage.getItem('token'))

  useEffect(() => {
    const loadDeck = async () => {
      try {
        const response = await getSharedDeck(token)
        setDeck(response)

        if (localStorage.getItem('token')) {
          const subjectsResponse = await api.get('/subjects')
          const list = Array.isArray(subjectsResponse.data) ? subjectsResponse.data : subjectsResponse.data.subjects || []

          setSubjects(list)
          if (list.length > 0) setSubjectId(list[0]._id)
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load shared deck.')
      } finally {
        setLoading(false)
      }
    }

    loadDeck()
  }, [token])

  const handleCopy = async () => {
    if (!subjectId) {
      toast.error('Please select a subject.')
      return
    }

    try {
      setCopying(true)
      await copySharedDeck(token, subjectId)
      setCopied(true)
      toast.success('Deck copied to your subjects!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not copy deck.')
    } finally {
      setCopying(false)
    }
  }

  const topBar = (
    <div className="mb-8 flex items-center justify-between gap-3">
      <BrandLogo />
      {isLoggedIn ? (
        <Link to="/" className={secondaryBtn}>
          Go to dashboard
        </Link>
      ) : (
        <div className="flex gap-2">
          <Link to="/login" className={secondaryBtn}>
            Log in
          </Link>
          <Link to="/signup" className={primaryBtn}>
            Sign up free
          </Link>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        {topBar}
        <div className="h-44 animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${cardClass} h-32 animate-pulse`} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        {topBar}
        <div className={`${cardClass} mx-auto max-w-lg px-6 py-12 text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <ShareIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-medium tracking-tight text-slate-900">Shared deck unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <p className="mt-1 text-sm text-slate-500">The owner may have stopped sharing it.</p>
          <Link to="/" className={`${primaryBtn} mt-6`}>
            Go to home
          </Link>
        </div>
      </div>
    )
  }

  const count = deck?.cards?.length || 0

  return (
    <div className="mx-auto max-w-4xl">
      {topBar}

      <section className="rounded-3xl bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#5546d6] p-7 text-white shadow-xl shadow-indigo-900/15">
        <p className={`${eyebrow} text-indigo-300`}>Shared deck</p>
        <h1 className="mt-1 text-3xl font-medium tracking-tight">{deck?.name}</h1>
        <p className="mt-1 text-sm text-indigo-100/80">
          {count} {count === 1 ? 'card' : 'cards'} shared with you
        </p>

        {isLoggedIn ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              aria-label="Copy into subject"
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white outline-none focus:ring-4 focus:ring-white/20 [&>option]:text-slate-900"
            >
              {subjects.length === 0 && <option value="">No subjects yet</option>}
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCopy}
              disabled={copying || !subjectId}
              className="h-10 rounded-xl bg-white px-4 text-[13px] font-semibold text-indigo-900 hover:bg-indigo-50 disabled:opacity-50"
            >
              {copying ? 'Copying…' : 'Copy to my subjects'}
            </button>
            {copied && (
              <Link to={`/subjects/${subjectId}`} className="text-[13px] font-semibold text-mint hover:underline">
                Open subject →
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/signup" className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-indigo-900 hover:bg-indigo-50">
              Sign up to study this deck
            </Link>
            <span className="text-[13px] text-indigo-200">
              Have an account?{' '}
              <Link to="/login" className="font-semibold text-white hover:underline">
                Log in
              </Link>
            </span>
          </div>
        )}
      </section>

      <p className={`${eyebrow} mb-3 mt-8 text-slate-400`}>Cards · {count}</p>
      {count ? (
        <ol className="grid gap-3 sm:grid-cols-2">
          {deck.cards.map((card, index) => (
            <li key={card._id || index} className={`${cardClass} p-5`}>
              <p className="text-[11px] font-semibold text-slate-400">{String(index + 1).padStart(2, '0')}</p>
              <p className="mt-2 text-[14px] font-medium text-slate-900">{card.front}</p>
              <p className="mt-3 border-t border-slate-100 pt-3 text-[13px] leading-6 text-slate-600">{card.back}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className={`${cardClass} p-6 text-center text-sm text-slate-500`}>This deck has no cards yet.</p>
      )}
    </div>
  )
}
