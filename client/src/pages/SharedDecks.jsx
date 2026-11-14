import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getSharedDecks } from '../api/dashboard.js'
import { unshareDeck } from '../api/decks.js'
import PageHeader, { cardClass, secondaryBtn } from '../components/PageHeader.jsx'
import { ShareIcon } from '../components/Icons.jsx'

// Shared Decks: every deck the user is sharing, with its public link
export default function SharedDecks() {
  const [decks, setDecks] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getSharedDecks({ signal: controller.signal })
      .then(setDecks)
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Could not load your shared decks.')
      })
    return () => controller.abort()
  }, [])

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy. Select the link and copy it yourself.')
    }
  }

  async function stop(deck) {
    if (!window.confirm(`Stop sharing “${deck.name}”? The old link will stop working.`)) return
    try {
      await unshareDeck(deck._id)
      setDecks((list) => list.filter((d) => d._id !== deck._id))
      toast.success('Sharing turned off')
    } catch {
      toast.error('Could not stop sharing. Please try again.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Learn together"
        title="Shared Decks"
        subtitle="Decks you have shared. Anyone with the link can view them and copy them to their account."
      />

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!decks && !error && <div className={`${cardClass} h-32 animate-pulse`} />}

      {decks?.length === 0 && (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-brand-500">
            <ShareIcon />
          </span>
          <p className="mt-3 text-sm text-slate-500">You are not sharing any decks yet. Open a deck and press “Share”.</p>
          <Link to="/subjects" className={`${secondaryBtn} mt-4`}>
            Go to my subjects
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {decks?.map((deck) => (
          <div key={deck._id} className={`${cardClass} flex flex-wrap items-center gap-4 p-4`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand-500">
              <ShareIcon />
            </span>
            <div className="min-w-0 flex-1">
              <Link to={`/subjects/${deck.subjectId}/decks/${deck._id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-brand-500">
                {deck.name}
              </Link>
              <p className="text-xs text-slate-500">
                {deck.subjectName} · {deck.cardCount} cards
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-slate-400">{deck.shareUrl}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => copy(deck.shareUrl)} className={secondaryBtn}>
                Copy link
              </button>
              <a href={deck.shareUrl} target="_blank" rel="noreferrer" className={secondaryBtn}>
                Open
              </a>
              <button
                type="button"
                onClick={() => stop(deck)}
                className="rounded-xl px-3 py-2 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                Stop sharing
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
