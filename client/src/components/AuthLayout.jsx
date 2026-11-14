import { Link } from 'react-router-dom'

// Logo used on the auth pages (matches the Figma design)
export function BrandLogo({ light = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="StudyPlanner AI home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-violet text-white shadow-lg shadow-indigo-500/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-5 w-5">
          <path d="M7 17 10 7M12 17l3-10M17 17l2-6" />
        </svg>
      </span>
      <span className={`text-[15px] font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        StudyPlanner<span className="ml-0.5 text-xs font-semibold text-brand-violet">AI</span>
      </span>
    </Link>
  )
}

const AVATARS = [
  { text: 'AM', className: 'bg-indigo-100 text-indigo-700' },
  { text: 'JT', className: 'bg-violet-100 text-violet-700' },
  { text: 'LK', className: 'bg-teal-100 text-teal-700' },
]

// Left side: dark brand panel with the headline and two floating sample cards
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#1b1745] via-[#2a2373] to-[#5546d6] p-10 text-white lg:flex lg:flex-col xl:p-12">
      {/* Soft glows and the large rings behind the cards */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute -right-20 top-1/4 h-120 w-120 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[34rem] w-[34rem] rounded-full border-[56px] border-white/[0.04]" />
        <div className="absolute right-[2%] top-[24%] h-[22rem] w-[22rem] rounded-full border border-white/[0.06]" />
      </div>

      <div className="relative z-10">
        <BrandLogo light />
      </div>

      <div className="relative z-10 mt-20 max-w-xl xl:mt-24">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
          <span className="h-px w-6 bg-indigo-300/70" />
          Learn with intention
        </p>
        <h2 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-[-0.035em] xl:text-6xl">
          Your smartest study session starts <span className="text-mint">here.</span>
        </h2>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-indigo-100/80">
          Turn scattered notes into focused study plans, memorable flashcards, and measurable progress.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {AVATARS.map((a) => (
              <span
                key={a.text}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-bold tracking-tight ring-2 ring-[#2a2373] ${a.className}`}
              >
                {a.text}
              </span>
            ))}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white ring-2 ring-[#2a2373]">
              +2k
            </span>
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold">Trusted by focused students</p>
            <p className="text-[11px] text-indigo-200/70">4.9 average learning experience</p>
          </div>
        </div>
      </div>

      {/* Floating sample cards */}
      <div className="relative z-10 mt-auto flex justify-end pr-2">
        <div className="relative h-64 w-80">
          <div
            className="float-card absolute right-2 top-0 flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur"
            style={{ '--tilt': '3deg' }}
          >
            <span className="text-amber-300" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2s1 3.5-1.5 6S7 12.5 7 15a5 5 0 0 0 10 0c0-3-2-4.5-2-4.5s.5 2.5-1.5 3.5C14 11 12 9 12 2Z" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-[10px] text-indigo-200">Study streak</span>
              <span className="block text-sm font-semibold">12 days</span>
            </span>
          </div>

          <div
            className="float-card absolute bottom-0 left-0 w-72 rounded-2xl border border-white/10 bg-[#1f1a55]/70 p-5 shadow-2xl shadow-black/30 backdrop-blur [animation-delay:1.5s]"
            style={{ '--tilt': '-3deg' }}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-200">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
                </svg>
                AI study plan
              </span>
              <span className="rounded-full bg-teal-400/15 px-2 py-0.5 text-[10px] font-medium text-teal-200">Ready</span>
            </div>
            <p className="mt-3 text-[15px] font-semibold">Organic Chemistry Midterm</p>
            <div className="mt-3 flex gap-1.5">
              {[1, 1, 1, 0].map((on, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${on ? 'bg-indigo-400' : 'bg-white/15'}`} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px]">
              <span className="text-indigo-200/70">12-day plan</span>
              <span className="font-medium text-indigo-200">On track →</span>
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-10 text-xs text-indigo-100/70">
        “StudyPlanner finally made my workload feel manageable.” <span className="text-indigo-300/70">— Maya, Neuroscience</span>
      </p>
    </aside>
  )
}

const YEAR = new Date().getFullYear()

// Split-screen layout for Login and Signup (Figma design)
export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-[#f8f9fc] lg:grid-cols-[1.08fr_1fr]">
      <BrandPanel />

      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <BrandLogo />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </div>

        <div className="mx-auto flex w-full max-w-3xl items-center justify-between text-[11px] text-slate-400">
          <span>© {YEAR} StudyPlanner AI</span>
          <span>Privacy · Terms</span>
        </div>
      </section>
    </div>
  )
}
