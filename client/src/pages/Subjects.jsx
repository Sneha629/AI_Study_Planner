
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client.js'

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5v16M8 7h8M8 11h7" />
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

function getToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatExamDate(date) {
  if (!date) return 'Not scheduled'

  const [year, month, day] = date.slice(0, 10).split('-')
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    'en-IN',
    { day: 'numeric', month: 'short', year: 'numeric' },
  )
}

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [subjectName, setSubjectName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  const today = getToday()

  useEffect(() => {
    let cancelled = false

    async function loadSubjects() {
      try {
        setLoading(true)
        setError('')

        const response = await api.get('/subjects')

        if (!cancelled) {
          setSubjects(Array.isArray(response.data) ? response.data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Unable to load subjects.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSubjects()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleAddSubject(event) {
    event.preventDefault()

    const name = subjectName.trim()

    if (!name || name.length > 100) {
      toast.error('Subject name must be between 1 and 100 characters.')
      return
    }

    if (examDate && examDate < today) {
      toast.error('Exam date cannot be in the past.')
      return
    }

    try {
      setSaving(true)

      const payload = { name }
      if (examDate) payload.examDate = examDate

      const response = await api.post('/subjects', payload)

      setSubjects((current) => [response.data, ...current])
      setSubjectName('')
      setExamDate('')
      toast.success('Subject added successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to add subject.')
    } finally {
      setSaving(false)
    }
  }

  function startRename(subject) {
    setEditingId(subject._id)
    setEditingName(subject.name)
  }

  function cancelRename() {
    setEditingId(null)
    setEditingName('')
  }

  async function handleRename(subjectId) {
    const name = editingName.trim()

    if (!name || name.length > 100) {
      toast.error('Subject name must be between 1 and 100 characters.')
      return
    }

    try {
      setRenaming(true)

      const response = await api.patch(`/subjects/${subjectId}`, { name })

      setSubjects((current) =>
        current.map((subject) =>
          subject._id === subjectId ? response.data : subject,
        ),
      )

      cancelRename()
      toast.success('Subject renamed successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to rename subject.')
    } finally {
      setRenaming(false)
    }
  }

  async function handleDelete(subject) {
    const confirmed = window.confirm(
      `Delete "${subject.name}"? Its decks, cards, notes and reviews will also be deleted.`,
    )

    if (!confirmed) return

    try {
      setDeletingId(subject._id)

      await api.delete(`/subjects/${subject._id}`)

      setSubjects((current) =>
        current.filter((item) => item._id !== subject._id),
      )

      toast.success('Subject deleted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to delete subject.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-9 text-white shadow-xl shadow-indigo-950/10 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            YOUR PERSONAL LEARNING SPACE
          </div>

          <h1 className="text-3xl font-bold sm:text-4xl">
            My Subjects
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
            Organize your subjects, plan your exam preparation and keep every
            study topic in one place.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-2xl font-bold">{subjects.length}</p>
              <p className="text-xs text-indigo-200">Total subjects</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-2xl font-bold">
                {subjects.filter((subject) => subject.examDate).length}
              </p>
              <p className="text-xs text-indigo-200">Exam dates set</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-bold tracking-widest text-indigo-600">
            GET STARTED
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Add a New Subject
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a subject and optionally add its exam date.
          </p>
        </div>

        <form onSubmit={handleAddSubject} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="subjectName" className="mb-2 block text-sm font-semibold text-slate-700">
              Subject Name
            </label>
            <input
              id="subjectName"
              type="text"
              placeholder="e.g. Mathematics"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              maxLength={100}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label htmlFor="examDate" className="mb-2 block text-sm font-semibold text-slate-700">
              Exam Date <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              id="examDate"
              type="date"
              value={examDate}
              min={today}
              onChange={(event) => setExamDate(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {saving ? 'Adding Subject...' : '+ Add Subject'}
          </button>
        </form>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-indigo-600">
              YOUR COLLECTION
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Your Subjects
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a subject to explore its study decks.
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
            {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Loading your subjects...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-7 text-center">
            <p className="font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BookIcon />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-800">
              No subjects yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Add your first subject above to start building your personal
              study space.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject, index) => (
              <article
                key={subject._id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className={`h-2 bg-gradient-to-r ${cardColors[index % cardColors.length]}`} />

                <div className="p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white ${cardColors[index % cardColors.length]}`}>
                      <BookIcon />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      Subject {index + 1}
                    </span>
                  </div>

                  {editingId === subject._id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        handleRename(subject._id)
                      }}
                      className="space-y-3"
                    >
                      <label htmlFor={`rename-${subject._id}`} className="text-xs font-semibold text-slate-600">
                        New subject name
                      </label>
                      <input
                        id={`rename-${subject._id}`}
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        maxLength={100}
                        autoFocus
                        required
                        className="w-full rounded-lg border border-indigo-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={renaming}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {renaming ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          disabled={renaming}
                          onClick={cancelRename}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <h3 className="break-words text-lg font-bold text-slate-900">
                        {subject.name}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Exam Date: <span className="font-medium text-slate-700">{formatExamDate(subject.examDate)}</span>
                      </p>

                      <Link
                        to={`/subjects/${subject._id}`}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition group-hover:gap-3 hover:text-indigo-800"
                      >
                        View Decks <span aria-hidden="true">→</span>
                      </Link>
                    </>
                  )}

                  <div className="mt-5 flex gap-4 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      disabled={renaming || deletingId === subject._id}
                      onClick={() => startRename(subject)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      <EditIcon /> Rename
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === subject._id || renaming}
                      onClick={() => handleDelete(subject)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <TrashIcon />
                      {deletingId === subject._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
