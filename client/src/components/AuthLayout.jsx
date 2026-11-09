const features = [
  'AI-generated flashcards from your notes',
  'Spaced repetition that tells you what to revise today',
  'Streaks and progress to keep you going',
]

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-white md:flex">
        <div className="relative z-10">
          <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur">
            🧠
          </div>
          <h2 className="text-3xl font-bold leading-tight">
            Upload your notes,
            <br />
            get exam-ready.
          </h2>
          <p className="mt-3 text-indigo-100">
            Turn any chapter into flashcards and revise at exactly the right time.
          </p>
        </div>

        <ul className="relative z-10 mt-10 space-y-4 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs">
                ✓
              </span>
              <span className="text-indigo-50">{f}</span>
            </li>
          ))}
        </ul>

        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10" />
      </aside>

      <section className="p-8 sm:p-10">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </section>
    </div>
  )
}