
import { Link } from 'react-router-dom'

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

const journeyFeatures = [
  {
    icon: '📅',
    title: 'Stay on Track',
    description:
      'Keep your study schedule organized and stay aware of important exam dates.',
  },
  {
    icon: '🎯',
    title: 'Build Better Habits',
    description:
      'Create a consistent learning routine and make every study session productive.',
  },
  {
    icon: '🎓',
    title: 'Prepare with Confidence',
    description:
      'Stay prepared with organized topics, focused learning and planned revision.',
  },
]

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 pb-0">

      {/* Hero Section */}
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

      {/* Existing Features Section */}
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

      {/* New Study Journey Section */}
      <section id="journey" className="space-y-5">
        <div>
          <p className="text-xs font-bold tracking-widest text-indigo-600">
            YOUR PATH TO SUCCESS
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Your Study Journey, Simplified
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Small steps, smart planning and consistent efforts can make
            your learning journey better.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {journeyFeatures.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl transition group-hover:bg-indigo-100">
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

      {/* Get Started Section */}
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

      {/* Responsive Footer */}
      <footer className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white">

        <div className="grid gap-10 px-6 py-10 sm:grid-cols-2 sm:px-10 lg:grid-cols-3">

          {/* Brand */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold shadow-lg">
                S
              </span>

              <span className="text-xl font-bold tracking-tight">
                StudyPlanner
                <span className="ml-1 text-indigo-300">AI</span>
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-7 text-indigo-200">
              Your personal learning companion. Organize your subjects,
              create study decks and make every study session count.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Quick Links
            </h3>

            <div className="mt-5 flex flex-col items-start gap-3 text-sm text-indigo-200">
              <Link to="/" className="transition hover:text-white">
                Home
              </Link>

              <Link to="/subjects" className="transition hover:text-white">
                My Subjects
              </Link>

              <a href="#features" className="transition hover:text-white">
                Features
              </a>

              <a href="#journey" className="transition hover:text-white">
                Study Journey
              </a>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Learn Better
            </h3>

            <p className="mt-5 text-sm leading-7 text-indigo-200">
              Stay focused, build better habits and prepare for your
              academic goals with smarter study planning.
            </p>

            <Link
              to="/subjects"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition hover:text-white"
            >
              Start Learning <span>→</span>
            </Link>
          </div>

        </div>

        {/* Copyright */}
        <div className="mx-6 border-t border-white/15 py-5 text-center sm:mx-10">
          <p className="text-xs leading-6 text-indigo-200">
            © 2026 StudyPlanner AI. All rights reserved.
          </p>

          <p className="mt-1 text-xs text-indigo-300">
            Plan smarter. Learn better. Achieve more.
          </p>
        </div>

      </footer>

    </div>
  )
}
