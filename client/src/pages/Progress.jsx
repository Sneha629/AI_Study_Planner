import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client.js'

const WEEKS = 26

function toKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function levelClass(count) {
  if (count <= 0) return 'bg-slate-100'
  if (count < 5) return 'bg-indigo-200'
  if (count < 10) return 'bg-indigo-400'
  if (count < 20) return 'bg-indigo-600'
  return 'bg-indigo-800'
}

function StreakCard({ streak }) {
  const current = streak?.current ?? 0
  const longest = streak?.longest ?? 0
  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 p-6 text-white shadow-lg">
      <p className="text-sm font-medium text-orange-100">Current streak</p>
      <p className="mt-1 text-5xl font-bold">
        🔥 {current}
        <span className="ml-2 text-xl font-medium text-orange-100">{current === 1 ? 'day' : 'days'}</span>
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>Longest: {longest} {longest === 1 ? 'day' : 'days'}</span>
        <span className="rounded-full bg-white/20 px-3 py-1">
          {streak?.studiedToday ? 'Studied today ✓' : 'Study today to keep it going'}
        </span>
      </div>
    </div>
  )
}

function Heatmap({ data, todayKey }) {
  const weeks = useMemo(() => {
    const counts = new Map(data.map((x) => [x.date, x.count]))
    const today = parseKey(todayKey)
    // Is hafte ke Sunday se (WEEKS - 1) hafte peeche se shuru
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - today.getDay() - (WEEKS - 1) * 7,
    )
    const cols = []
    for (let w = 0; w < WEEKS; w++) {
      const col = []
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + dow)
        const key = toKey(d)
        col.push({ key, count: counts.get(key) || 0, future: d > today })
      }
      cols.push(col)
    }
    return cols
  }, [data, todayKey])

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="flex w-max gap-1">
          {weeks.map((col, i) => (
            <div key={i} className="flex flex-col gap-1">
              {col.map((day) =>
                day.future ? (
                  <div key={day.key} className="h-3 w-3" />
                ) : (
                  <div
                    key={day.key}
                    title={`${day.count} review${day.count === 1 ? '' : 's'} on ${day.key}`}
                    className={`h-3 w-3 rounded-sm ${levelClass(day.count)}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-slate-500">
        <span>Less</span>
        {[0, 1, 5, 10, 20].map((n) => (
          <div key={n} className={`h-3 w-3 rounded-sm ${levelClass(n)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

function examText(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return 'No exam date'
  if (daysLeft < 0) return 'Exam date passed'
  if (daysLeft === 0) return 'Exam today'
  return `Exam in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
}

function SubjectProgress({ subject }) {
  const total = subject.totalCards || 0
  const learned = subject.learnedCards || 0
  const mastered = subject.masteredCards || 0
  const learnedPct = total ? Math.round((learned / total) * 100) : 0
  const masteredPct = total ? Math.round((mastered / total) * 100) : 0
  const urgent =
    subject.daysLeft !== null && subject.daysLeft !== undefined && subject.daysLeft >= 0 && subject.daysLeft <= 7

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{subject.name}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            urgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {examText(subject.daysLeft)}
        </span>
      </div>

      <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-300" style={{ width: `${learnedPct}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-600" style={{ width: `${masteredPct}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-xs text-slate-500">
        <span>
          {learned}/{total} learned ({learnedPct}%)
        </span>
        <span>{mastered} mastered</span>
        <span>{subject.dueToday || 0} cards due today</span>
      </div>
    </div>
  )
}

export default function Progress() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/stats/overview')
      setData(res.data)
    } catch (err) {
      setError(
        !err.response
          ? 'Cannot reach the server. Is it running?'
          : err.response?.data?.error || 'Could not load your progress.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="text-center text-slate-500">Loading...</p>

  if (error) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const heatmap = data.heatmap || []
  const subjects = data.subjects || []
  const todayKey = data.date || toKey(new Date())

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Your progress</h1>

      {heatmap.length === 0 && subjects.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-4xl">📈</p>
          <p className="mt-3 text-slate-600">Start studying to see your progress</p>
        </div>
      ) : (
        <>
          <StreakCard streak={data.streak} />

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 font-semibold text-slate-900">Study activity (last 26 weeks)</h2>
            {heatmap.length === 0 ? (
              <p className="text-sm text-slate-500">Start studying to see your progress</p>
            ) : (
              <Heatmap data={heatmap} todayKey={todayKey} />
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-slate-900">Subjects</h2>
            {subjects.length === 0 ? (
              <p className="text-slate-500">No subjects yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {subjects.map((s) => (
                  <SubjectProgress key={s._id} subject={s} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}