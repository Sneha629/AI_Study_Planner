import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { deleteNote, generateCards, listNotes, listSubjects, saveGeneratedCards, uploadNote } from '../api/notes.js'
import { getDecks } from '../api/decks.js'
import { cardClass, primaryBtn, secondaryBtn } from '../components/PageHeader.jsx'
import { fieldInput as inputClass, fieldTextarea } from '../components/Modal.jsx'
import { IconButton, TrashIcon } from '../components/IconButtons.jsx'
import { SparkIcon } from '../components/Icons.jsx'

const MAX_MB = 5
const COUNTS = [10, 20, 30]
const LOADING_LINES = ['Reading your notes…', 'Finding the key ideas…', 'Writing questions…', 'Checking the answers…']
const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.18em]'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function errorText(err, fallback) {
  return err.response?.data?.details?.[0]?.message || err.response?.data?.error || fallback
}

function FileBadge({ type }) {
  const pdf = type === 'pdf'
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold uppercase ${
        pdf ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'
      }`}
    >
      {type}
    </span>
  )
}

// Drag-and-drop or click to upload one .pdf/.txt file
function Dropzone({ onFile, uploading, progress }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)

  function pick(files) {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (!uploading) pick(e.dataTransfer.files)
      }}
      className={`relative rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        over ? 'border-brand-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-violet text-white shadow-lg shadow-indigo-500/25">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      </div>
      {uploading ? (
        <div className="mx-auto mt-5 max-w-xs">
          <p className="text-sm font-semibold text-slate-700">Uploading and reading your file… {progress}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-linear-to-r from-brand-500 to-brand-violet transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <>
          <p className="mt-5 text-lg font-medium tracking-tight text-slate-900">Drop your notes here</p>
          <p className="mt-1 text-sm text-slate-500">PDF or TXT, up to {MAX_MB} MB. We read the text so AI can make cards from it.</p>
          <button type="button" onClick={() => inputRef.current?.click()} className={`${primaryBtn} mt-5`}>
            Choose a file
          </button>
        </>
      )}
    </div>
  )
}

function Generating({ fileName, more }) {
  const [line, setLine] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <div className={`${cardClass} px-6 py-16 text-center`}>
      <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-violet text-white shadow-lg shadow-indigo-500/25">
        <SparkIcon className="h-8 w-8 animate-spin [animation-duration:3s]" />
      </div>
      <p className="mt-6 text-lg font-semibold text-slate-900">{LOADING_LINES[line]}</p>
      <p className="mt-1 text-sm text-slate-500">
        {more ? 'Making new cards, different from the ones you already have, ' : 'Making flashcards '}
        from “{fileName}”. This usually takes 10–30 seconds.
      </p>
    </div>
  )
}

// Review AI cards: edit, untick or delete, choose the deck, then save
function Preview({ note, result, decks, onCancel, onRegenerate, onSaved }) {
  const [cards, setCards] = useState(() => result.cards.map((c, i) => ({ ...c, id: i, keep: true })))
  // "Generate more": start with the deck the earlier cards from this note went into
  const lastDeck = decks.find((d) => d._id === result.lastDeckId)
  const [mode, setMode] = useState(lastDeck ? 'existing' : 'new')
  const [deckName, setDeckName] = useState(result.suggestedDeckName)
  const [deckId, setDeckId] = useState(lastDeck?._id ?? decks[0]?._id ?? '')
  const [saving, setSaving] = useState(false)

  const kept = cards.filter((c) => c.keep && c.front.trim() && c.back.trim())
  const update = (id, patch) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  async function save() {
    if (kept.length === 0) return toast.error('Keep at least one card to save.')
    if (mode === 'new' && !deckName.trim()) return toast.error('Give the new deck a name.')
    setSaving(true)
    try {
      const data = await saveGeneratedCards(note._id, {
        deckId: mode === 'existing' ? deckId : undefined,
        deckName: mode === 'new' ? deckName.trim() : undefined,
        cards: kept.map(({ front, back }) => ({ front: front.trim(), back: back.trim() })),
      })
      onSaved(data)
    } catch (err) {
      toast.error(errorText(err, 'Could not save the cards.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className={`${cardClass} flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6`}>
        <div>
          <p className={`${eyebrow} text-brand-500`}>AI preview</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">
            {result.cards.length} cards from “{note.fileName}”
          </h2>
          <p className="mt-1 text-sm text-slate-500">Edit anything that looks wrong and untick cards you don’t want.</p>
          {result.alreadyMade > 0 && (
            <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
              You already have {result.alreadyMade} cards from this note, so the AI was asked for new ones
              {result.skipped > 0 && `; ${result.skipped} repeat${result.skipped === 1 ? ' was' : 's were'} left out`}.
            </p>
          )}
          {!result.usedAllText &&
            (result.coveredAll ? (
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                This round reached the end of your note, so every part has now been used. Next time it starts again from the beginning.
              </p>
            ) : (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Your note is long, so these cards come from one part of it. Press “Generate more” later to cover the next parts.
              </p>
            ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={secondaryBtn} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={onRegenerate} className={secondaryBtn} disabled={saving}>
            <SparkIcon className="h-4 w-4" /> Regenerate
          </button>
        </div>
      </div>

      <div className={`${cardClass} p-5 sm:p-6`}>
        <p className={`${eyebrow} text-slate-400`}>Save to</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-2xl border p-4 transition ${mode === 'new' ? 'border-indigo-400 bg-indigo-50/60 ring-4 ring-indigo-100' : 'border-slate-200'}`}>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="radio" name="mode" checked={mode === 'new'} onChange={() => setMode('new')} className="accent-indigo-600" />
              New deck
            </span>
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              onFocus={() => setMode('new')}
              maxLength={100}
              className={`${inputClass} mt-3`}
              placeholder="Deck name"
            />
          </label>
          <label
            className={`rounded-2xl border p-4 transition ${decks.length ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${
              mode === 'existing' ? 'border-indigo-400 bg-indigo-50/60 ring-4 ring-indigo-100' : 'border-slate-200'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                type="radio"
                name="mode"
                disabled={!decks.length}
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
                className="accent-indigo-600"
              />
              Existing deck
            </span>
            <select
              value={deckId}
              disabled={!decks.length}
              onChange={(e) => setDeckId(e.target.value)}
              onFocus={() => setMode('existing')}
              className={`${inputClass} mt-3`}
            >
              {decks.length ? decks.map((d) => <option key={d._id} value={d._id}>{d.name}</option>) : <option>No decks yet</option>}
            </select>
          </label>
        </div>
      </div>

      <ol className="space-y-3">
        {cards.map((c, i) => (
          <li
            key={c.id}
            className={`rounded-2xl border bg-white p-4 shadow-sm shadow-slate-900/3 transition sm:p-5 ${c.keep ? 'border-slate-200/80' : 'border-dashed border-slate-200 opacity-50'}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500">
                <input type="checkbox" checked={c.keep} onChange={(e) => update(c.id, { keep: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
                Card {String(i + 1).padStart(2, '0')}
              </label>
              <button
                type="button"
                onClick={() => setCards((cs) => cs.filter((x) => x.id !== c.id))}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                Delete
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Question</p>
                <textarea rows={3} maxLength={500} value={c.front} onChange={(e) => update(c.id, { front: e.target.value })} className={fieldTextarea} />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Answer</p>
                <textarea rows={3} maxLength={2000} value={c.back} onChange={(e) => update(c.id, { back: e.target.value })} className={fieldTextarea} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
        <p className="text-sm text-slate-600">
          <span className="font-bold text-slate-900">{kept.length}</span> of {cards.length} cards will be saved
        </p>
        <button type="button" onClick={save} disabled={saving || kept.length === 0} className={primaryBtn}>
          {saving ? 'Saving…' : `Save ${kept.length} ${kept.length === 1 ? 'card' : 'cards'}`}
        </button>
      </div>
    </div>
  )
}

function Saved({ data, subjectId, onDone }) {
  const light = 'rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-indigo-900 hover:bg-indigo-50'
  const ghost = 'rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/15'
  return (
    <section className="rounded-3xl bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#5546d6] p-7 text-center text-white shadow-xl shadow-indigo-900/15 sm:text-left">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-mint sm:mx-0">
        <SparkIcon className="h-6 w-6" />
      </span>
      <p className={`${eyebrow} mt-4 text-indigo-300`}>Cards saved</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">
        {data.saved} {data.saved === 1 ? 'card' : 'cards'} added ✨
      </h2>
      <p className="mt-1 text-sm text-indigo-100/80">
        They are in “{data.deck.name}” ({data.deck.cardCount} cards) and ready to study today.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
        <Link to={`/study?deckId=${data.deck._id}`} className={light}>
          Study now →
        </Link>
        <Link to={`/subjects/${subjectId}/decks/${data.deck._id}`} className={ghost}>
          Open deck
        </Link>
        <button type="button" onClick={onDone} className={ghost}>
          Back to notes
        </button>
      </div>
    </section>
  )
}

// F5 + F6: upload notes for a subject and turn them into flashcards with AI
export default function Notes() {
  const { id: subjectId } = useParams()
  const [subject, setSubject] = useState(null)
  const [notes, setNotes] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [counts, setCounts] = useState({}) // noteId -> chosen card count
  // view: { name: 'list' } | { name: 'generating', note } | { name: 'preview', note, result, decks } | { name: 'saved', data }
  const [view, setView] = useState({ name: 'list' })

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([listNotes(subjectId, { signal: controller.signal }), listSubjects()])
      .then(([noteList, subjects]) => {
        setNotes(noteList)
        setSubject(subjects.find((s) => s._id === subjectId) ?? null)
      })
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError(errorText(err, 'Could not load your notes.'))
      })
    return () => controller.abort()
  }, [subjectId])

  async function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'txt'].includes(ext)) return toast.error('Only PDF and TXT files are allowed.')
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`File must be ${MAX_MB} MB or smaller.`)
    setUploading(true)
    setProgress(0)
    try {
      const note = await uploadNote(subjectId, file, setProgress)
      setNotes((list) => [note, ...(list ?? [])])
      toast.success('Notes uploaded! Now make cards from them ✨')
    } catch (err) {
      toast.error(errorText(err, 'Upload failed. Please try again.'))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(note) {
    if (!window.confirm(`Delete “${note.fileName}”? Cards already made from it will stay.`)) return
    try {
      await deleteNote(note._id)
      setNotes((list) => list.filter((n) => n._id !== note._id))
      toast.success('Note deleted')
    } catch (err) {
      toast.error(errorText(err, 'Could not delete the note.'))
    }
  }

  async function handleGenerate(note) {
    setView({ name: 'generating', note })
    try {
      const [result, decks] = await Promise.all([generateCards(note._id, counts[note._id] ?? 20), getDecks(subjectId)])
      setView({ name: 'preview', note, result, decks: Array.isArray(decks) ? decks : [] })
    } catch (err) {
      setView({ name: 'list' })
      toast.error(errorText(err, 'The AI could not make cards right now. Please try again.'), { duration: 6000 })
    }
  }

  const backToList = () => setView({ name: 'list' })

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      <div>
        <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link to="/subjects" className="hover:text-slate-900">My Subjects</Link>
          <span>›</span>
          <Link to={`/subjects/${subjectId}`} className="truncate hover:text-slate-900">{subject?.name ?? 'Subject'}</Link>
          <span>›</span>
          <span className="font-medium text-slate-700">Notes</span>
        </nav>
        <p className={`${eyebrow} mt-4 text-brand-500`}>{subject?.name ?? 'Subject'} · AI flashcards</p>
        <h1 className="mt-1 text-3xl font-medium tracking-tight text-slate-900">Notes to flashcards</h1>
        <p className="mt-1 text-sm text-slate-500">Upload a chapter, let AI write the cards, check them, and start revising.</p>
      </div>

      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {view.name === 'generating' && <Generating fileName={view.note.fileName} more={view.note.cardCount > 0} />}

      {view.name === 'preview' && (
        <Preview
          key={view.result.cards.map((c) => c.front).join('|')}
          note={view.note}
          result={view.result}
          decks={view.decks}
          onCancel={backToList}
          onRegenerate={() => handleGenerate(view.note)}
          onSaved={(data) => {
            // Keep "N cards made" right without reloading the list
            const id = view.note._id
            setNotes((list) => list.map((n) => (n._id === id ? { ...n, cardCount: (n.cardCount ?? 0) + data.saved } : n)))
            setView({ name: 'saved', data })
          }}
        />
      )}

      {view.name === 'saved' && <Saved data={view.data} subjectId={subjectId} onDone={backToList} />}

      {view.name === 'list' && (
        <>
          <Dropzone onFile={handleFile} uploading={uploading} progress={progress} />

          <section>
            <p className={`${eyebrow} mb-3 text-slate-400`}>
              Your notes {notes && <span>· {notes.length}</span>}
            </p>

            {notes === null && !error && (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
                ))}
              </div>
            )}

            {notes?.length === 0 && (
              <p className={`${cardClass} px-4 py-8 text-center text-sm text-slate-500`}>No notes yet. Upload your first chapter above.</p>
            )}

            <ul className="space-y-3">
              {notes?.map((note) => (
                <li key={note._id} className={`${cardClass} flex flex-wrap items-center gap-4 p-4`}>
                  <FileBadge type={note.fileType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{note.fileName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      ~{Math.max(1, Math.round(note.textLength / 6)).toLocaleString('en-IN')} words · {formatDate(note.createdAt)}
                      {note.cardCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                          {note.cardCount} {note.cardCount === 1 ? 'card' : 'cards'} made
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Number of cards">
                      {COUNTS.map((n) => {
                        const active = (counts[note._id] ?? 20) === n
                        return (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setCounts((c) => ({ ...c, [note._id]: n }))}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${active ? 'bg-white text-brand-500 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                    <button type="button" onClick={() => handleGenerate(note)} className={primaryBtn}>
                      <SparkIcon className="h-4 w-4" /> {note.cardCount > 0 ? 'Generate more' : 'Generate cards'}
                    </button>
                    <IconButton label={`Delete ${note.fileName}`} onClick={() => handleDelete(note)} danger>
                      <TrashIcon />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
