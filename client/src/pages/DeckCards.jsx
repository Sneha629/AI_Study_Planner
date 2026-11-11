
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCards, createCard, updateCard, deleteCard } from '../api/cards.js'

export default function DeckCards() {
  const { id, deckId } = useParams()
  const navigate = useNavigate()

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    let cancelled = false

    getCards(deckId)
      .then((data) => {
        if (!cancelled) setCards(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error.response?.data?.error || 'Could not load cards')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [deckId])

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return cards

    return cards.filter((card) =>
      `${card.front} ${card.back}`.toLowerCase().includes(query),
    )
  }, [cards, search])

  const resetForm = () => {
    setFront('')
    setBack('')
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const cleanFront = front.trim()
    const cleanBack = back.trim()

    if (!cleanFront || !cleanBack) {
      toast.error('Both question and answer are required')
      return
    }

    if (cleanFront.length > 500 || cleanBack.length > 2000) {
      toast.error('Question or answer exceeds the allowed length')
      return
    }

    try {
      setSaving(true)

      if (editingId) {
        const updated = await updateCard(editingId, cleanFront, cleanBack)
        setCards((previous) =>
          previous.map((card) => card._id === editingId ? updated : card),
        )
        toast.success('Card updated successfully')
      } else {
        const created = await createCard(deckId, cleanFront, cleanBack)
        setCards((previous) => [...previous, created])
        toast.success('Card created successfully')
      }

      resetForm()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save card')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (card) => {
    setEditingId(card._id)
    setFront(card.front)
    setBack(card.back)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return

    try {
      setDeletingId(cardId)
      await deleteCard(cardId)
      setCards((previous) => previous.filter((card) => card._id !== cardId))
      if (editingId === cardId) resetForm()
      toast.success('Card deleted successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete card')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to={`/subjects/${id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← Back to decks
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Deck Cards</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, manage and search your learning cards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/study?deckId=${deckId}`)}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          ▶ Study this deck
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          {editingId ? 'Edit card' : 'Create a new card'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Front / Question
            </label>
            <textarea
              value={front}
              onChange={(event) => setFront(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Enter your question..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {front.length}/500
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Back / Answer
            </label>
            <textarea
              value={back}
              onChange={(event) => setBack(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Enter the answer..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {back.length}/2000
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add card'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your cards</h2>
            <p className="text-sm text-slate-500">
              {cards.length} {cards.length === 1 ? 'card' : 'cards'} in this deck
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions and answers..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:max-w-xs"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
            Loading cards...
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h3 className="font-semibold text-slate-800">
              {cards.length === 0 ? 'No cards yet' : 'No matching cards'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {cards.length === 0
                ? 'Create your first card using the form above.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card) => (
              <article
                key={card._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    card.source === 'ai'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {card.source === 'ai' ? 'AI' : 'Manual'}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(card)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(card._id)}
                      disabled={deletingId === card._id}
                      className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === card._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Front
                  </p>
                  <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-900">
                    {card.front}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Back
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {card.back}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
