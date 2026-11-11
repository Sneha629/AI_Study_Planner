
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getSharedDeck, copySharedDeck } from '../api/decks.js'
import api from '../api/client.js'

export default function SharedDeck() {
  const { token } = useParams()

  const [deck, setDeck] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState('')

  const isLoggedIn = Boolean(localStorage.getItem('token'))

  useEffect(() => {
    const loadDeck = async () => {
      try {
        const response = await getSharedDeck(token)
        setDeck(response)

        if (localStorage.getItem('token')) {
          const subjectsResponse = await api.get('/subjects')
          const list = Array.isArray(subjectsResponse.data)
            ? subjectsResponse.data
            : subjectsResponse.data.subjects || []

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
      toast.success('Deck copied successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not copy deck.')
    } finally {
      setCopying(false)
    }
  }

  if (loading) return <p className="text-center">Loading shared deck...</p>

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Shared deck unavailable</h1>
        <p className="mt-2 text-slate-600">{error}</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Go to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">{deck?.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {deck?.cards?.length || 0} cards shared with you
        </p>

        {isLoggedIn ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {subjects.length === 0 && <option value="">No subjects available</option>}
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleCopy}
              disabled={copying || !subjectId}
              className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {copying ? 'Copying...' : 'Copy to My Decks'}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            <Link to="/login" className="font-medium text-blue-600 hover:underline">
              Login
            </Link>{' '}
            to copy this deck into your subjects.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {deck?.cards?.length ? (
          deck.cards.map((card, index) => (
            <div key={card._id || index} className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Card {index + 1}
              </p>
              <p className="mt-2 font-semibold text-slate-800">{card.front}</p>
              <p className="mt-3 border-t border-slate-100 pt-3 text-slate-600">
                {card.back}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-white p-6 text-center text-slate-500">
            This deck has no cards yet.
          </p>
        )}
      </div>
    </div>
  )
}
