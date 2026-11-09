const { addDays } = require('../utils/dates')

// SM-2 spaced repetition (SuperMemo 2). Our four buttons map to SM-2's 0-5 quality scale.
const QUALITY = { again: 0, hard: 3, good: 4, easy: 5 }
const RATINGS = Object.keys(QUALITY)
const MIN_EASE = 1.3

// Works out a card's next state after the student rates it.
// state: { easeFactor, intervalDays, repetitions }, rating: again|hard|good|easy, today: "YYYY-MM-DD"
function schedule(state, rating, today) {
  const q = QUALITY[rating]
  if (q === undefined) throw new Error(`Unknown rating: ${rating}`)

  let { easeFactor, intervalDays, repetitions } = state

  if (q < 3) {
    // Forgot it: start the repetitions again and see it tomorrow. SM-2 keeps the ease as is.
    repetitions = 0
    intervalDays = 1
  } else {
    if (repetitions === 0) intervalDays = 1
    else if (repetitions === 1) intervalDays = 6
    else intervalDays = Math.round(intervalDays * easeFactor)
    repetitions += 1
    // Easier answers raise the ease, harder ones lower it, never below 1.3
    easeFactor += 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
    easeFactor = Math.max(MIN_EASE, Math.round(easeFactor * 100) / 100)
  }

  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueDate: addDays(today, intervalDays),
    isNewCard: false,
  }
}

module.exports = { schedule, RATINGS }
