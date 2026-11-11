
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client.js'

const features = [
  {
    icon: '📚',
    title: 'Organize Subjects',
    description: 'Keep all your subjects and exam dates organized in one place.',
  },
  {
    icon: '🗂️',
    title: 'Create Study Decks',
    description: 'Divide every subject into manageable topics and study decks.',
  },
  {
    icon: '🧠',
    title: 'Smart Revision',
    description: 'Build a consistent revision routine with spaced repetition.',
  },
]

export default function Home() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true

    api.get('/health')
      .then((res) => {
        if (active) setStatus(res.data.status === 'ok' ? 'online' : 'offline')
      })
      .catch(() => {
        if (active) setStatus('offline')
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-12 text-white shadow-xl sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            YOUR PERSONAL AI STUDY PLANNER
          </div>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Study smarter.
            <span className="block text-indigo-300">Stay exam-ready.</span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-indigo-100 sm:text-base">
            Bring your subjects, study decks and revision plans together.
            Stay organized, build better study habits and make every study
            session count.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/subjects"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              Explore My Subjects →
            </Link>

            <a
              href="#features"
              className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Discover Features
            </a>
          </div>
        </div>

        <div className="relative z-10 mt-12 grid grid-cols-2 gap-3 border-t border-white/15 pt-6 sm:max-w-md">
          <div>
            <p className="text-2xl font-bold">01</p>
            <p className="mt-1 text-xs text-indigo-200">Organize subjects</p>
          </div>
          <div>
            <p className="text-2xl font-bold">02</p>
            <p className="mt-1 text-xs text-indigo-200">Plan your revision</p>
          </div>
        </div>
      </section>

      <section id="features" className="space-y-5">
        <div>
          <p className="text-xs font-bold tracking-widest text-indigo-600">
            EVERYTHING IN ONE PLACE
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Make learning more organized
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Simple tools to help you manage your study material and prepare
            with confidence.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                {feature.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Ready to organize your learning?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Start by adding your subjects and setting your exam dates.
          </p>
        </div>

        <Link
          to="/subjects"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Get Started →
        </Link>
      </section>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <span
          className={`h-2 w-2 rounded-full ${
            status === 'online'
              ? 'bg-emerald-500'
              : status === 'offline'
                ? 'bg-red-500'
                : 'animate-pulse bg-amber-400'
          }`}
        />
        Backend {status === 'checking' ? 'checking...' : status}
      </div>
    </div>
  )
}
