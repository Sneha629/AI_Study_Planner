const { Schema, model } = require('mongoose')

// MongoDB has no cascade delete: when a subject is deleted, the route must also
// delete its notes, decks, cards and reviews (PRD Section 7).
const subjectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // "YYYY-MM-DD" in the student's time zone; null when no exam is set (F3)
    examDate: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

module.exports = model('Subject', subjectSchema)
