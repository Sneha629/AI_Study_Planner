
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getDecks,
  createDeck,
  renameDeck,
  deleteDeck,
} from '../api/decks.js'

export default function SubjectDecks() {
  const { id } = useParams()

  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [deckName, setDeckName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  // Load subject decks
  useEffect(() => {
    let cancelled = false

    getDecks(id)
      .then((data) => {
        if (!cancelled) {
          setDecks(data.decks || [])
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error.response?.data?.error || 'Could not load decks'
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // Create a new deck
  const handleCreate = async (event) => {
    event.preventDefault()

    if (!deckName.trim()) {
      toast.error('Please enter a deck name')
      return
    }

    try {
      setSaving(true)

      const data = await createDeck(id, deckName.trim())

      setDecks((previous) => [...previous, data.deck])
      setDeckName('')

      toast.success('Deck created successfully')
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Could not create deck'
      )
    } finally {
      setSaving(false)
    }
  }

  // Rename an existing deck
  const handleRename = async (deckId) => {
    if (!editingName.trim()) {
      toast.error('Deck name cannot be empty')
      return
    }

    try {
      const data = await renameDeck(deckId, editingName.trim())

      setDecks((previous) =>
        previous.map((deck) =>
          deck._id === deckId ? data.deck : deck
        )
      )

      setEditingId(null)
      setEditingName('')

      toast.success('Deck renamed successfully')
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Could not rename deck'
      )
    }
  }

  // Delete a deck
  const handleDelete = async (deckId) => {
    if (!window.confirm('Are you sure you want to delete this deck?')) {
      return
    }

    try {
      await deleteDeck(deckId)

      setDecks((previous) =>
        previous.filter((deck) => deck._id !== deckId)
      )

      toast.success('Deck deleted successfully')
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Could not delete deck'
      )
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          Subject / Decks
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Your Study Decks
        </h1>

        <p className="mt-2 text-slate-600">
          Organize your study cards into separate decks.
        </p>
      </div>

      {/* Create deck form */}
      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-xl border bg-white p-5 sm:flex-row"
      >
        <input
          type="text"
          value={deckName}
          onChange={(event) => setDeckName(event.target.value)}
          placeholder="Enter new deck name"
          maxLength={100}
          className="min-w-0 flex-1 rounded-lg border px-4 py-2 outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Creating...' : '+ Create Deck'}
        </button>
      </form>

      {/* Deck list */}
      {loading ? (
        <p className="py-8 text-center text-slate-500">
          Loading decks...
        </p>
      ) : decks.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">
            No decks yet
          </h2>

          <p className="mt-2 text-slate-500">
            Create your first deck to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {decks.map((deck) => (
            <article
              key={deck._id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              {editingId === deck._id ? (
                <div className="space-y-3">
                  <input
                    value={editingName}
                    onChange={(event) =>
                      setEditingName(event.target.value)
                    }
                    maxLength={100}
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                    autoFocus
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRename(deck._id)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
                    >
                      Save
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">
                    {deck.name}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {deck.cardCount ?? 0} cards
                  </p>

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(deck._id)
                        setEditingName(deck.name)
                      }}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Rename
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(deck._id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
