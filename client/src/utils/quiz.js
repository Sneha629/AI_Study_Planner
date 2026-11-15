// Colour by score: 80%+ green, 50-79% amber, below 50% rose
export function scoreTone(percent) {
  if (percent >= 80) return { pill: 'bg-emerald-50 text-emerald-700', label: 'Great work' }
  if (percent >= 50) return { pill: 'bg-amber-50 text-amber-700', label: 'Good effort' }
  return { pill: 'bg-rose-50 text-rose-600', label: 'Keep practising' }
}

// "Today, 10:40 pm" / "Yesterday, 9:05 am" / "12 Nov 2026"
export function formatWhen(iso) {
  const at = new Date(iso)
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((start(new Date()) - start(at)) / 86400000)
  const time = at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  if (days <= 0) return `Today, ${time}`
  if (days === 1) return `Yesterday, ${time}`
  return at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
