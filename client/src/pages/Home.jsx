import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getOverview } from '../api/dashboard.js'
import { getDueCards } from '../api/study.js'
import { cardClass } from '../components/PageHeader.jsx'
import { BookIcon, CheckIcon, FlameIcon, PlayIcon, SparkIcon, TargetIcon, TrophyIcon } from '../components/Icons.jsx'

// Colour sets for subject cards, used in turn (Figma: green, blue, orange, violet)
const SUBJECT_STYLES = [
  { card: 'from-emerald-50 to-teal-50/40 border-emerald-100', bar: 'bg-emerald-500', tag: 'bg-emerald-100 text-emerald-700' },
  { card: 'from-sky-50 to-indigo-50/40 border-sky-100', bar: 'bg-sky-500', tag: 'bg-sky-100 text-sky-700' },
  { card: 'from-orange-50 to-amber-50/40 border-orange-100', bar: 'bg-orange-400', tag: 'bg-orange-100 text-orange-700' },
  { card: 'from-violet-50 to-fuchsia-50/40 border-violet-100', bar: 'bg-violet-500', tag: 'bg-violet-100 text-violet-700' },
]

function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekdayLetter(ymd) {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }).slice(0, 1)
}

function niceDate(ymd) {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

// "+12%", "-5%" or null when there is nothing to compare with
function change(now, before) {
  if (!before) return null
  const pct = Math.round(((now - before) / before) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function Ring({ percent, size = 128, stroke = 10, children, track = 'rgba(255,255,255,0.12)', color = '#9ff0d8' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

function MiniBars({ values, color }) {
  const max = Math.max(1, ...values)
  return (
    <div className="flex h-8 items-end gap-0.5">
      {values.map((v, i) => (
        <span key={i} className={`w-1.5 rounded-sm ${color} ${i === values.length - 1 ? '' : 'opacity-50'}`} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </div>
  )
}

function StatCard({ icon, iconClass, label, value, sub, right }) {
  return (
    <div className={`${cardClass} flex items-center gap-4 p-4`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="text-xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className="truncate text-[11px] text-slate-400">{sub}</p>
      </div>
      {right}
    </div>
  )
}

function Hero({ name, ready, done, streak, activity }) {
  const total = done + ready
  const percent = total ? Math.round((done / total) * 100) : 100
  const weekChange = change(activity.thisWeek, activity.lastWeek)

  return (
    <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#5546d6] p-7 text-white shadow-xl shadow-indigo-900/20 sm:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[48px] border-white/[0.04]" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
            <span className="h-px w-5 bg-indigo-300/70" /> Your learning hub
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
            Make today count,
            <span className="block text-violet-300">{name}.</span>
          </h1>
          <p className="mt-4 text-sm text-indigo-100/80">
            {ready > 0 ? (
              <>
                Your momentum is building. You have <b className="text-white">{ready} cards</b> ready to review
                {streak > 0 ? ` and a ${streak}-day streak to keep alive.` : '.'}
              </>
            ) : total > 0 ? (
              'All caught up for today. Come back tomorrow to keep the streak going.'
            ) : (
              'Upload your notes and let AI turn them into flashcards to get started.'
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/subjects" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-indigo-900 shadow-lg transition hover:bg-indigo-50">
              <SparkIcon className="h-4 w-4" /> Create with AI
            </Link>
            <Link to="/study" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/15">
              <PlayIcon className="h-3.5 w-3.5" /> Quick study
            </Link>
          </div>
        </div>

        <div className="relative mx-auto md:mx-0 md:mr-6">
          <Ring percent={percent}>
            <span className="text-[10px] text-indigo-200">Today</span>
            <span className="text-3xl font-semibold">{percent}%</span>
            <span className="text-[10px] text-indigo-200">
              {done} / {total} cards
            </span>
          </Ring>
          {streak > 0 && (
            <span className="absolute -right-6 -top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
              <FlameIcon className="h-3.5 w-3.5 text-amber-300" /> {streak}-day streak
            </span>
          )}
          <span className="absolute -bottom-3 -left-8 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] leading-tight backdrop-blur">
            <span className="block text-indigo-200">This week</span>
            <span className="block font-semibold">{weekChange ? `${weekChange} vs last week` : `${activity.thisWeek} cards`}</span>
          </span>
        </div>
      </div>
    </section>
  )
}

function StudyPlan({ subjects, date }) {
  // Today's plan: subjects with cards (due ones first, nearest exam first)
  const items = subjects
    .filter((s) => s.totalCards > 0)
    .sort((a, b) => (a.dueToday === 0) - (b.dueToday === 0) || (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9))
    .slice(0, 4)
  const done = items.filter((s) => s.dueToday === 0).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  return (
    <section className={`${cardClass} flex flex-col p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Today · {niceDate(date)}</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Your study plan</h2>
        </div>
        <Link to="/planner" className="text-xs font-medium text-brand-500 hover:underline">
          View planner →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-slate-500">No cards yet. Add a subject and make cards to get a daily plan.</p>
          <Link to="/subjects" className="mt-3 text-xs font-semibold text-brand-500 hover:underline">
            Add a subject →
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex-1 space-y-2">
            {items.map((s) => {
              const finished = s.dueToday === 0
              return (
                <li key={s._id}>
                  <Link
                    to={finished ? `/subjects/${s._id}` : `/study?subjectId=${s._id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${finished ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-brand-500'}`}>
                      {finished ? <CheckIcon className="h-4 w-4" /> : <BookIcon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-medium ${finished ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {s.name}: {finished ? 'all reviews done' : 'review due cards'}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {finished ? 'Completed for today' : `${s.dueToday} cards due`}
                        {s.daysLeft !== null && s.daysLeft >= 0 && ` · exam in ${s.daysLeft} days`}
                      </span>
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${finished ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
                      {finished && <CheckIcon className="h-3 w-3" />}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-500">
            <span>
              <b className="text-slate-700">
                {done} of {items.length}
              </b>{' '}
              done
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full bg-linear-to-r from-brand-500 to-brand-violet" style={{ width: `${pct}%` }} />
            </span>
            <span className="font-semibold text-brand-500">{pct}%</span>
          </div>
        </>
      )}
    </section>
  )
}

function StudyActivity({ heatmap, date, thisWeek }) {
  const counts = new Map(heatmap.map((d) => [d.date, d.count]))
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6))
  const values = days.map((d) => counts.get(d) || 0)
  const max = Math.max(1, ...values)

  return (
    <section className={`${cardClass} p-5`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Learning rhythm</p>
      <h2 className="mt-1 text-base font-semibold text-slate-900">Study activity</h2>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {thisWeek} <span className="text-xs font-medium text-slate-400">cards reviewed in the last 7 days</span>
      </p>
      <div className="mt-5 flex h-36 gap-3">
        {days.map((d, i) => {
          const isToday = i === days.length - 1
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-lg bg-slate-100">
                {isToday && values[i] > 0 && (
                  <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">{values[i]}</span>
                )}
                <div
                  className={`w-full rounded-lg ${isToday ? 'bg-brand-500' : 'bg-indigo-300'}`}
                  style={{ height: `${(values[i] / max) * 100}%` }}
                  title={`${values[i]} cards`}
                />
              </div>
              <span className={`text-[10px] ${isToday ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>{weekdayLetter(d)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SubjectCards({ subjects }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Keep exploring</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Your subjects</h2>
        </div>
        <Link to="/subjects" className="text-xs font-medium text-brand-500 hover:underline">
          View all →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {subjects.slice(0, 3).map((s, i) => {
          const style = SUBJECT_STYLES[i % SUBJECT_STYLES.length]
          const mastery = s.totalCards ? Math.round((s.learnedCards / s.totalCards) * 100) : 0
          return (
            <Link key={s._id} to={`/subjects/${s._id}`} className={`block rounded-2xl border bg-linear-to-br p-4 transition hover:-translate-y-0.5 hover:shadow-md ${style.card}`}>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${style.tag}`}>{s.name.slice(0, 3)}</span>
              <p className="mt-3 truncate text-[15px] font-semibold text-slate-900">{s.name}</p>
              <p className="text-[11px] text-slate-500">
                {s.totalCards} cards · {s.masteredCards} mastered
              </p>
              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
                <span>Learned</span>
                <span className="font-semibold text-slate-700">{mastery}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/80">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${mastery}%` }} />
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                {s.dueToday > 0 ? `${s.dueToday} due today` : 'Nothing due'}
                {s.daysLeft !== null && s.daysLeft >= 0 && ` · exam in ${s.daysLeft}d`}
              </p>
            </Link>
          )
        })}
        <Link
          to="/subjects"
          className="flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-4 text-center transition hover:border-brand-500/50 hover:bg-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-xl text-brand-500">+</span>
          <p className="mt-2 text-[13px] font-semibold text-slate-800">Add a subject</p>
          <p className="text-[11px] text-slate-400">Organise your next learning goal</p>
        </Link>
      </div>
    </section>
  )
}

// Dashboard (Figma design): hero, stats, today's plan, weekly activity and subjects
export default function Home() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getOverview({ signal: controller.signal }), getDueCards({ signal: controller.signal })])
      .then(([overview, due]) => setData({ overview, due }))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Could not load your dashboard. Please refresh.')
      })
    return () => controller.abort()
  }, [])

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      </div>
    )
  }

  const { overview, due } = data
  const ready = due.counts.review + due.counts.new
  const done = due.doneToday.review + due.doneToday.new
  const firstName = user?.name?.split(' ')[0] || 'there'
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(overview.date, i - 6)).map(
    (d) => overview.heatmap.find((h) => h.date === d)?.count || 0,
  )
  const monthChange = change(overview.activity.last30Days, overview.activity.previous30Days)
  const retention = overview.retention.rate
  const masteredPct = overview.totals.cards ? Math.round((overview.totals.masteredCards / overview.totals.cards) * 100) : 0

  return (
    <div className="space-y-6">
      <Hero name={firstName} ready={ready} done={done} streak={overview.streak.current} activity={overview.activity} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BookIcon />}
          iconClass="bg-indigo-50 text-brand-500"
          label="Cards reviewed"
          value={overview.totals.reviews.toLocaleString('en-IN')}
          sub={monthChange ? `${monthChange} vs previous 30 days` : `${overview.activity.last30Days} in the last 30 days`}
          right={<MiniBars values={last7} color="bg-brand-500" />}
        />
        <StatCard
          icon={<TargetIcon />}
          iconClass="bg-emerald-50 text-emerald-600"
          label="Retention rate"
          value={retention === null ? '–' : `${retention}%`}
          sub={retention === null ? 'Study a few cards to see it' : `Remembered, last 30 days (${overview.retention.reviews} reviews)`}
          right={
            <Ring percent={retention ?? 0} size={44} stroke={5} track="#e2e8f0" color="#10b981">
              <span className="text-[9px] font-semibold text-slate-600">{retention === null ? '–' : `${Math.round(retention)}%`}</span>
            </Ring>
          }
        />
        <StatCard
          icon={<TrophyIcon />}
          iconClass="bg-amber-50 text-amber-600"
          label="Cards mastered"
          value={overview.totals.masteredCards.toLocaleString('en-IN')}
          sub={`of ${overview.totals.cards} cards · shown 3+ weeks apart`}
          right={
            <Ring percent={masteredPct} size={44} stroke={5} track="#e2e8f0" color="#f59e0b">
              <span className="text-[9px] font-semibold text-slate-600">{masteredPct}%</span>
            </Ring>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <StudyPlan subjects={overview.subjects} date={overview.date} />
        </div>
        <div className="lg:col-span-2">
          <StudyActivity heatmap={overview.heatmap} date={overview.date} thisWeek={overview.activity.thisWeek} />
        </div>
      </div>

      <SubjectCards subjects={overview.subjects} />
    </div>
  )
}
