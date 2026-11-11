// Shows how strong a new password is. Only "8+ characters" is required by the server;
// the other checks are tips that make the password harder to guess.
const CHECKS = [
  { label: '8+ characters', test: (p) => p.length >= 8 },
  { label: 'Upper & lower case', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
  { label: 'A symbol (!@#…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

const LEVELS = [
  { label: 'Too short', bar: 'bg-red-400', text: 'text-red-600' },
  { label: 'Weak', bar: 'bg-orange-400', text: 'text-orange-600' },
  { label: 'Fair', bar: 'bg-amber-400', text: 'text-amber-600' },
  { label: 'Good', bar: 'bg-lime-500', text: 'text-lime-600' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600' },
]

export default function PasswordStrength({ password }) {
  if (!password) return null
  const passed = CHECKS.map((c) => c.test(password))
  // Under 8 characters is always "Too short", whatever else it has
  const score = passed[0] ? passed.filter(Boolean).length : 0
  const level = LEVELS[score]

  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= Math.max(score, 1) ? level.bar : 'bg-slate-200'}`} />
          ))}
        </div>
        <span className={`w-16 text-right text-xs font-semibold ${level.text}`}>{level.label}</span>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {CHECKS.map((c, i) => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs ${passed[i] ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span aria-hidden="true">{passed[i] ? '✓' : '○'}</span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
