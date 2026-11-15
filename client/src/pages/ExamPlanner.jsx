import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSubjects } from '../api/dashboard.js'
import { getExamPlan } from '../api/decks.js'
import PageHeader, { cardClass, secondaryBtn } from '../components/PageHeader.jsx'
import { CalendarIcon } from '../components/Icons.jsx'

const STATUS = {
  'on-track': { label: 'On track', className: 'bg-emerald-50 text-emerald-700' },
  behind: { label: 'Behind', className: 'bg-amber-50 text-amber-700' },
  'no-exam': { label: 'No exam date', className: 'bg-slate-100 text-slate-600' },
}

function formatDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function weekday(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2)
}

// Next 7 days: new cards (violet) on top of reviews (indigo)
function WeekBars({ schedule }) {
  const max = Math.max(1, ...schedule.map((d) => d.newCards + d.reviews))
  return (
    <div className="flex h-24 gap-2">
      {schedule.map((d) => {
        const total = d.newCards + d.reviews
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.reviews} reviews, ${d.newCards} new`}>
            <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-md bg-slate-100">
              <div className="bg-violet-400" style={{ height: `${(d.newCards / max) * 100}%` }} />
              <div className="bg-indigo-500" style={{ height: `${(d.reviews / max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-slate-400">{total ? total : '·'}</span>
            <span className="text-[10px] font-medium text-slate-500">{weekday(d.date)}</span>
          </div>
        )
      })}
    </div>
  )
}

// Exam Planner: the plan for every subject that has an exam date
export default function ExamPlanner() {
  const [plans, setPlans] = useState(null) // [{ subject, plan }]
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listSubjects({ signal: controller.signal })
      .then((subjects) => Promise.all(subjects.map(async (subject) => ({ subject, plan: await getExamPlan(subject._id) }))))
      .then((list) =>
        // Soonest exam first; subjects without an exam at the end
        setPlans(list.sort((a, b) => (a.plan.daysLeft ?? 1e9) - (b.plan.daysLeft ?? 1e9))),
      )
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setError('Could not load your exam plans.')
      })
    return () => controller.abort()
  }, [])

  const withExam = plans?.filter((p) => p.plan.status !== 'no-exam') ?? []
  const withoutExam = plans?.filter((p) => p.plan.status === 'no-exam') ?? []

  return (
    <div>
      <PageHeader eyebrow="Stay ahead" title="Exam Planner" subtitle="How many new cards to learn each day so every card is ready before the exam." />

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!plans && !error && <div className={`${cardClass} h-48 animate-pulse`} />}

      {plans && withExam.length === 0 && (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <p className="text-sm text-slate-500">Add an exam date to a subject to get a day-by-day plan.</p>
          <Link to="/subjects" className={`${secondaryBtn} mt-4`}>
            Go to my subjects
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {withExam.map(({ subject, plan }) => {
          const status = STATUS[plan.status] ?? STATUS['on-track']
          return (
            <Link key={subject._id} to={`/subjects/${subject._id}`} className={`${cardClass} block p-5 transition hover:-translate-y-0.5 hover:shadow-md`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900">{subject.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {plan.daysLeft === 0 ? 'Exam today' : `Exam in ${plan.daysLeft} days`} · {formatDate(subject.examDate)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 py-2">
                  <p className="text-lg font-semibold text-slate-900">{plan.newPerDay ?? '–'}</p>
                  <p className="text-[10px] text-slate-500">new cards / day</p>
                </div>
                <div className="rounded-xl bg-slate-50 py-2">
                  <p className="text-lg font-semibold text-slate-900">{plan.newCardsLeft}</p>
                  <p className="text-[10px] text-slate-500">new cards left</p>
                </div>
                <div className="rounded-xl bg-slate-50 py-2">
                  <p className="text-lg font-semibold text-slate-900">{plan.dueToday}</p>
                  <p className="text-[10px] text-slate-500">due today</p>
                </div>
              </div>

              <p className="mb-2 mt-4 text-[11px] font-medium text-slate-500">Next 7 days</p>
              <WeekBars schedule={plan.schedule} />
            </Link>
          )
        })}
      </div>

      {withoutExam.length > 0 && (
        <p className="mt-6 text-xs text-slate-500">
          No exam date yet: {withoutExam.map((p) => p.subject.name).join(', ')}.{' '}
          <Link to="/subjects" className="font-medium text-brand-500 hover:underline">
            Set dates
          </Link>
        </p>
      )}
    </div>
  )
}
