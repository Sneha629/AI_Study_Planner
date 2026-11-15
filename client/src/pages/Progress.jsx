import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client.js'
import PageHeader, { cardClass, primaryBtn } from '../components/PageHeader.jsx'
import { ChartIcon, FlameIcon, TargetIcon, TrophyIcon } from '../components/Icons.jsx'

const WEEKS = 26
const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.18em]'

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
  if (count < 20) return 'bg-brand-500'
  return 'bg-indigo-800'
}

// Small stat card in the dashboard style
function Stat({ icon, label, value, note }) {
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between">
        <p className={`${eyebrow} text-slate-400`}>{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-brand-500">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  )
}

function StreakHero({ streak }) {
  const current = streak?.current ?? 0
  const longest = streak?.longest ?? 0
  return (
    <section className="rounded-3xl bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#5546d6] p-6 text-white shadow-xl shadow-indigo-900/15">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-orange-300">
            <FlameIcon className="h-7 w-7" />
          </span>
          <div>
            <p className={`${eyebrow} text-indigo-300`}>Current streak</p>
            <p className="mt-0.5 text-3xl font-semibold tracking-tight">
              {current} <span className="text-base font-normal text-indigo-200">{current === 1 ? 'day' : 'days'}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
            Longest: {longest} {longest === 1 ? 'day' : 'days'}
          </span>
          <span className={`rounded-full px-3 py-1 font-semibold ${streak?.studiedToday ? 'bg-mint text-[#1b1745]' : 'bg-white text-indigo-900'}`}>
            {streak?.studiedToday ? 'Studied today ✓' : 'Study today to keep it going'}
          </span>
        </div>
      </div>
    </section>
  )
}

function Heatmap({ data, todayKey }) {
  const weeks = useMemo(() => {
    const counts = new Map(data.map((x) => [x.date, x.count]))
    const today = parseKey(todayKey)
    // Starts on the Sunday (WEEKS - 1) weeks before this week
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (WEEKS - 1) * 7)
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
      {/* Columns share the card width; cells stay square */}
      <div className="mx-auto flex max-w-4xl gap-1 sm:gap-1.5">
        {weeks.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-1.5">
            {col.map((day) =>
              day.future ? (
                <div key={day.key} className="aspect-square w-full" />
              ) : (
                <div
                  key={day.key}
                  title={`${day.count} review${day.count === 1 ? '' : 's'} on ${day.key}`}
                  className={`aspect-square w-full rounded-[3px] sm:rounded-[5px] ${levelClass(day.count)}`}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-slate-500">
        <span>Less</span>
        {[0, 1, 5, 10, 20].map((n) => (
          <div key={n} className={`h-3 w-3 rounded-[3px] ${levelClass(n)}`} />
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
  const urgent = subject.daysLeft !== null && subject.daysLeft !== undefined && subject.daysLeft >= 0 && subject.daysLeft <= 7

  return (
    <Link to={`/subjects/${subject._id}`} className={`${cardClass} block p-5 transition hover:border-indigo-200`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-medium tracking-tight text-slate-900">{subject.name}</h3>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${urgent ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
          {examText(subject.daysLeft)}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <p className="text-2xl font-semibold tracking-tight text-slate-900">{learnedPct}%</p>
        <p className="text-xs text-slate-500">
          {learned}/{total} cards learned
        </p>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-200" style={{ width: `${learnedPct}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-brand-500 to-brand-violet" style={{ width: `${masteredPct}%` }} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {mastered} mastered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-200" />
          {Math.max(learned - mastered, 0)} learning
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {subject.dueToday || 0} due today
        </span>
      </div>
    </Link>
  )
}

function change(now, before) {
  if (!before) return now ? 'New this month' : 'No reviews yet'
  const pct = Math.round(((now - before) / before) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}% vs previous 30 days`
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
      setError(!err.response ? 'Cannot reach the server. Is it running?' : err.response?.data?.error || 'Could not load your progress.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const header = <PageHeader eyebrow="Your learning" title="Progress & Analytics" subtitle="Streak, study activity and how far each subject has come." />

  if (loading) {
    return (
      <div>
        {header}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${cardClass} h-32 animate-pulse`} />
          ))}
        </div>
        <div className={`${cardClass} mt-4 h-48 animate-pulse`} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        {header}
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <p className="text-sm text-rose-600">{error}</p>
          <button type="button" onClick={load} className={`${primaryBtn} mt-4`}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const heatmap = data.heatmap || []
  const subjects = data.subjects || []
  const todayKey = data.date || toKey(new Date())
  const totals = data.totals || {}
  const activity = data.activity || {}
  const masteredPct = totals.cards ? Math.round(((totals.masteredCards || 0) / totals.cards) * 100) : 0

  if (heatmap.length === 0 && subjects.length === 0) {
    return (
      <div>
        {header}
        <div className={`${cardClass} px-6 py-14 text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-violet text-white shadow-lg shadow-indigo-500/25">
            <ChartIcon className="h-7 w-7" />
          </span>
          <p className="mt-5 text-lg font-medium text-slate-900">Your progress will show up here</p>
          <p className="mt-1 text-sm text-slate-500">Add a subject and study a few cards to get started.</p>
          <Link to="/subjects" className={`${primaryBtn} mt-5`}>
            Go to my subjects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}

      <StreakHero streak={data.streak} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon={<ChartIcon className="h-4 w-4" />} label="Reviews · 30 days" value={activity.last30Days ?? 0} note={change(activity.last30Days ?? 0, activity.previous30Days ?? 0)} />
        <Stat icon={<FlameIcon className="h-4 w-4" />} label="This week" value={activity.thisWeek ?? 0} note={`${activity.today ?? 0} reviews today`} />
        <Stat
          icon={<TargetIcon className="h-4 w-4" />}
          label="Retention"
          value={data.retention?.rate === null || data.retention?.rate === undefined ? '—' : `${data.retention.rate}%`}
          note="Answers not marked Again"
        />
        <Stat icon={<TrophyIcon className="h-4 w-4" />} label="Mastered" value={`${masteredPct}%`} note={`${totals.masteredCards ?? 0} of ${totals.cards ?? 0} cards`} />
      </div>

      <section className={`${cardClass} p-6`}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className={`${eyebrow} text-slate-400`}>Study activity</p>
            <h2 className="mt-1 text-xl font-medium tracking-tight text-slate-900">Last 26 weeks</h2>
          </div>
          <p className="text-xs text-slate-500">{totals.reviews ?? 0} reviews in total</p>
        </div>
        {heatmap.length === 0 ? <p className="text-sm text-slate-500">Study a few cards and your activity will appear here.</p> : <Heatmap data={heatmap} todayKey={todayKey} />}
      </section>

      <section>
        <p className={`${eyebrow} mb-3 mt-2 text-slate-400`}>Subjects · {subjects.length}</p>
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500">No subjects yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {subjects.map((s) => (
              <SubjectProgress key={s._id} subject={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
