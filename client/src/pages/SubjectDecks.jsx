import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getDecks,
  createDeck,
  renameDeck,
  deleteDeck,
} from '../api/decks.js'

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5v16M8 7h8M8 11h7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="m14 5 5 5M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" />
    </svg>
  )
}

const cardColors = [
  'from-violet-500 to-indigo-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-orange-400 to-pink-500',
  'from-fuchsia-500 to-purple-600',
  'from-sky-500 to-indigo-500',
]

export default function SubjectDecks() {
  const { id } = useParams()

  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [deckName, setDeckName] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getDecks(id)
      .then((data) => {
        if (!cancelled) {
          setDecks(Array.isArray(data) ? data : [])
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error.response?.data?.error || 'Could not load decks')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const totalCards = useMemo(
    () => decks.reduce((total, deck) => total + (deck.cardCount || 0), 0),
    [decks],
  )

  const filteredDecks = useMemo(
    () =>
      decks.filter((deck) =>
        deck.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [decks, search],
  )

  const handleCreate = async (event) => {
    event.preventDefault()

    const name = deckName.trim()

    if (!name) {
      toast.error('Please enter a deck name')
      return
    }

    if (name.length > 100) {
      toast.error('Deck name cannot exceed 100 characters')
      return
    }

    try {
      setSaving(true)
      const data = await createDeck(id, name)

      setDecks((previous) => [...previous, data])
      setDeckName('')
      toast.success('Your new deck is ready!')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not create deck')
    } finally {
      setSaving(false)
    }
  }

  const startRename = (deck) => {
    setEditingId(deck._id)
    setEditingName(deck.name)
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleRename = async (deckId) => {
    const name = editingName.trim()

    if (!name) {
      toast.error('Deck name cannot be empty')
      return
    }

    if (name.length > 100) {
      toast.error('Deck name cannot exceed 100 characters')
      return
    }

    try {
      setRenaming(true)
      const data = await renameDeck(deckId, name)

      setDecks((previous) =>
        previous.map((deck) =>
          deck._id === deckId
            ? { ...data, cardCount: deck.cardCount }
            : deck,
        ),
      )

      cancelRename()
      toast.success('Deck renamed successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not rename deck')
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async (deckId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this deck? Its cards and review history will also be deleted.',
    )

    if (!confirmed) return

    try {
      setDeletingId(deckId)
      await deleteDeck(deckId)

      setDecks((previous) =>
        previous.filter((deck) => deck._id !== deckId),
      )

      toast.success('Deck deleted successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete deck')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-10">
      {/* Hero section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-9 text-white shadow-xl shadow-indigo-950/10 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            YOUR PERSONAL LEARNING SPACE
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your Study Decks<span className="text-violet-300">.</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/80 sm:text-base">
            Turn your study material into organized knowledge. Create decks,
            manage your cards, and make every study session count.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-indigo-100/80">
            <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
              {decks.length} study decks
            </span>
            <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
              {totalCards} learning cards
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-7 right-10 hidden opacity-20 lg:block">
          <BookIcon />
          <div className="mt-2 text-7xl font-bold">A+</div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Decks</p>
            <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
              <BookIcon />
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {decks.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Your organized subjects</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Cards</p>
            <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <span className="block text-xl">▤</span>
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {totalCards}
          </p>
          <p className="mt-1 text-xs text-slate-400">Cards across all decks</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Average Cards</p>
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <span className="block text-xl">↗</span>
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {decks.length ? Math.round(totalCards / decks.length) : 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Per study deck</p>
        </div>
      </section>

      {/* Create deck */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Create a new deck</h2>
          <p className="mt-1 text-sm text-slate-500">
            Give your next learning collection a name.
          </p>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={deckName}
            onChange={(event) => setDeckName(event.target.value)}
            placeholder="e.g. Data Structures, Operating Systems..."
            maxLength={100}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon />
            {saving ? 'Creating...' : 'Create Deck'}
          </button>
        </form>

        <p className="mt-2 text-right text-xs text-slate-400">
          {deckName.length}/100 characters
        </p>
      </section>

      {/* Deck collection */}
      <section>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              YOUR COLLECTION
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              All Study Decks
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage and organize your learning collections.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your decks..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-200" />
                <div className="mt-5 h-5 w-2/3 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
                <div className="mt-8 h-9 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BookIcon />
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-900">
              Your learning journey starts here
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              You haven't created any study decks yet. Create your first deck
              above and start organizing your learning material.
            </p>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
            <div className="text-3xl">⌕</div>
            <h3 className="mt-3 font-semibold text-slate-800">No decks found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try searching with a different name.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDecks.map((deck, index) => (
              <article
                key={deck._id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5"
              >
                <div className={`h-2 bg-gradient-to-r ${cardColors[index % cardColors.length]}`} />

                <div className="p-5">
                  {editingId === deck._id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        handleRename(deck._id)
                      }}
                    >
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Rename deck
                      </label>
                      <input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        maxLength={100}
                        autoFocus
                        className="mt-2 w-full rounded-xl border border-indigo-300 px-3 py-3 text-sm outline-none transition focus:ring-4 focus:ring-indigo-50"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="submit"
                          disabled={renaming}
                          className="flex-1 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {renaming ? 'Saving...' : 'Save changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          disabled={renaming}
                          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cardColors[index % cardColors.length]} text-white shadow-lg`}>
                          <BookIcon />
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                          Deck {index + 1}
                        </span>
                      </div>

                      <h3 className="mt-5 truncate text-lg font-bold text-slate-900">
                        {deck.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Your personal learning collection
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            {deck.cardCount ?? 0}
                          </p>
                          <p className="text-xs text-slate-400">Study cards</p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startRename(deck)}
                            aria-label={`Rename ${deck.name}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <EditIcon />
                            Rename
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(deck._id)}
                            disabled={deletingId === deck._id}
                            aria-label={`Delete ${deck.name}`}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingId === deck._id ? '...' : <TrashIcon />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
