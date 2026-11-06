const { Schema, model } = require('mongoose')

// One document per user, updated after each study day (PRD Section 8.4)
const streakSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  // "YYYY-MM-DD" in the student's time zone
  lastStudyDate: { type: String, default: null },
  // ISO week the free skip was used, e.g. "2026-W45"
  freezeUsedWeek: { type: String, default: null },
})

module.exports = model('Streak', streakSchema)
