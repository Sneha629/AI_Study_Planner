import { useEffect, useState } from 'react'

const features = [
  { icon: '✨', text: 'AI-generated flashcards from your notes' },
  { icon: '🧠', text: 'Spaced repetition that tells you what to revise today' },
  { icon: '🔥', text: 'Streaks and progress to keep you going' },
]

// A sample card on the left panel that flips by itself, so the idea is clear at a glance
const demoCards = [
  { q: 'What is inertia?', a: 'The tendency of a body to resist a change in its motion.' },
  { q: 'Formula of Newton’s second law?', a: 'F = m × a' },
  { q: 'What does mitochondria do?', a: 'Makes energy (ATP) for the cell.' },
]

// Soft animated colour blobs and a dot grid behind the page
function Backdrop() {
  return (
    // z-0 (not -z-10) so it paints above the app's plain bg-slate-50; the card sits on top with z-10
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50">
      <style>{`
        @keyframes auth-float { 0%,100% { transform: translate(0,0) scale(1) } 33% { transform: translate(40px,-30px) scale(1.08) } 66% { transform: translate(-30px,20px) scale(0.95) } }
        @media (prefers-reduced-motion: reduce) { .auth-blob { animation: none !important } }
      `}</style>
      <div className="auth-blob absolute -left-32 -top-32 h-112 w-md rounded-full bg-indigo-300/40 blur-3xl animate-[auth-float_18s_ease-in-out_infinite]" />
      <div className="auth-blob absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-fuchsia-300/35 blur-3xl animate-[auth-float_22s_ease-in-out_infinite_reverse]" />
      <div className="auth-blob absolute -bottom-40 left-1/3 h-120 w-120 rounded-full bg-violet-300/35 blur-3xl animate-[auth-float_26s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgb(99_102_241/0.12)_1px,transparent_1px)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />
    </div>
  )
}

function DemoCard() {
  // Each tick flips the card; every second tick moves to the next card
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => s + 1), 2800)
    return () => clearInterval(timer)
  }, [])

  const flipped = step % 2 === 1
  const index = Math.floor(step / 2) % demoCards.length
  const card = demoCards[index]
  // While turning back to the front, the back still shows the previous answer (no spoiler)
  const backCard = demoCards[Math.floor(Math.max(step - 1, 0) / 2) % demoCards.length]
  const face = 'absolute inset-0 flex flex-col justify-center rounded-2xl p-5 backface-hidden'

  return (
    <div className="relative z-10 mt-8 perspective-[1000px]">
      <div
        className="relative h-32 transition-transform duration-700 transform-3d"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        <div className={`${face} bg-white text-slate-900 shadow-xl shadow-indigo-900/20`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Question</span>
          <p className="mt-1 font-semibold">{card.q}</p>
        </div>
        <div className={`${face} bg-indigo-950/70 text-white ring-1 ring-white/20 backdrop-blur transform-[rotateY(180deg)]`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">Answer</span>
          <p className="mt-1 text-sm leading-relaxed">{backCard.a}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {demoCards.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
        ))}
      </div>
    </div>
  )
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <>
      <Backdrop />
      <div className="relative z-10 mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-white/80 shadow-2xl shadow-indigo-900/10 ring-1 ring-white backdrop-blur-xl md:grid-cols-2">
        <aside className="relative hidden flex-col overflow-hidden bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-white md:flex">
          <div className="relative z-10">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur">
              🧠
            </div>
            <h2 className="text-3xl font-bold leading-tight">
              Upload your notes,
              <br />
              get exam-ready.
            </h2>
            <p className="mt-3 text-indigo-100">Turn any chapter into flashcards and revise at exactly the right time.</p>
          </div>

          <DemoCard />

          <ul className="relative z-10 mt-8 space-y-3 text-sm">
            {features.map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">{f.icon}</span>
                <span className="text-indigo-50">{f.text}</span>
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
    </>
  )
}
