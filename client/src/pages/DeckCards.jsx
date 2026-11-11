
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCards, createCard, updateCard, deleteCard } from '../api/cards.js'
import { getQuizHistory, getQuizAttempt } from '../api/quiz.js'

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

  // Quiz history popup states
  const [historyOpen, setHistoryOpen] = useState(false)
  const [quizHistory, setQuizHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Quiz details popup states
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

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

  // Open quiz history popup
  const handleOpenHistory = async () => {
    setHistoryOpen(true)
    setHistoryLoading(true)

    try {
      const data = await getQuizHistory(deckId)
      setQuizHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load quiz history')
    } finally {
      setHistoryLoading(false)
    }
  }

  // Open individual quiz details popup
  const handleOpenAttempt = async (attempt) => {
    if (attempt.score === null) return

    setDetailsOpen(true)
    setDetailsLoading(true)
    setSelectedAttempt(null)

    try {
      const data = await getQuizAttempt(attempt._id)
      setSelectedAttempt(data)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load quiz details')
      setDetailsOpen(false)
    } finally {
      setDetailsLoading(false)
    }
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

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(`/study?deckId=${deckId}`)}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            ▶ Study this deck
          </button>

          <button
            type="button"
            onClick={() => navigate(`/decks/${deckId}/quiz`)}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            🧠 Quiz me
          </button>

          <button
            type="button"
            onClick={handleOpenHistory}
            className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            📜 History
          </button>
        </div>
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
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      card.source === 'ai'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
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

      {/* First popup: Quiz history */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  📜 Quiz History
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select an attempt to review your answers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
                aria-label="Close history"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Loading quiz history...
              </p>
            ) : quizHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
                <p className="font-semibold text-slate-700">
                  No quiz attempts yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Complete your first quiz to see your history here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizHistory.map((attempt) => (
                  <button
                    key={attempt._id}
                    type="button"
                    disabled={attempt.score === null}
                    onClick={() => handleOpenAttempt(attempt)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        Quiz Attempt
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(attempt.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-indigo-600">
                        {attempt.score === null
                          ? 'Not submitted'
                          : 'Click to view answers →'}
                      </p>
                    </div>

                    <div className="text-right">
                      {attempt.score === null ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700">
                          Pending
                        </span>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-indigo-700">
                            {attempt.score} / {attempt.total}
                          </p>
                          <p className="text-xs text-slate-500">
                            {Math.round((attempt.score / attempt.total) * 100)}% Score
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Second popup: Selected quiz answers */}
      {detailsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Quiz Review
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your selected answers and correct answers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
                aria-label="Close quiz review"
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Loading quiz details...
              </p>
            ) : selectedAttempt ? (
              <>
                <div className="mb-5 rounded-xl bg-indigo-50 p-4">
                  <p className="text-sm font-medium text-indigo-700">
                    Your Score
                  </p>
                  <p className="mt-1 text-3xl font-bold text-indigo-800">
                    {selectedAttempt.score} / {selectedAttempt.total}
                  </p>
                  <p className="mt-1 text-xs text-indigo-600">
                    {new Date(selectedAttempt.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-5">
                  {selectedAttempt.results.map((question, questionIndex) => (
                    <div
                      key={questionIndex}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">
                          Q{questionIndex + 1}. {question.question}
                        </h3>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            question.correct
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {question.correct ? '✓ Correct' : '✗ Wrong'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => {
                          const isCorrectAnswer =
                            optionIndex === question.correctIndex
                          const isChosen = optionIndex === question.chosen

                          return (
                            <div
                              key={optionIndex}
                              className={`rounded-lg border p-3 text-sm ${
                                isCorrectAnswer
                                  ? 'border-green-300 bg-green-50 text-green-800'
                                  : isChosen
                                    ? 'border-red-300 bg-red-50 text-red-800'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span>
                                  {String.fromCharCode(65 + optionIndex)}. {option}
                                </span>

                                <div className="flex flex-wrap gap-2">
                                  {isChosen && (
                                    <span className="text-xs font-bold">
                                      Your answer
                                    </span>
                                  )}
                                  {isCorrectAnswer && (
                                    <span className="text-xs font-bold">
                                      Correct answer
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {question.chosen === null && (
                        <p className="mt-3 text-sm font-medium text-amber-700">
                          You did not answer this question.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
