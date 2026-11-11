// Same SM-2 maths as server/src/services/sm2.js, used only to show
// "next review in X days" on each button before the student presses it.
// The server stays the source of truth for the real schedule.
const QUALITY = { again: 0, hard: 3, good: 4, easy: 5 }

export function nextInterval(card, rating) {
  const q = QUALITY[rating]
  if (q < 3) return 1
  if (card.repetitions === 0) return 1
  if (card.repetitions === 1) return 6
  return Math.round(card.intervalDays * card.easeFactor)
}

// 1 -> "1 day", 6 -> "6 days", 45 -> "1.5 mo", 400 -> "1.1 yr"
export function formatInterval(days) {
  if (days < 30) return days === 1 ? '1 day' : `${days} days`
  if (days < 365) return `${Math.round((days / 30) * 10) / 10} mo`
  return `${Math.round((days / 365) * 10) / 10} yr`
}
