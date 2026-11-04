const { Schema, model } = require('mongoose')

const cardSchema = new Schema(
  {
    deckId: { type: Schema.Types.ObjectId, ref: 'Deck', required: true },
    front: { type: String, required: true, trim: true },
    back: { type: String, required: true, trim: true },
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    noteId: { type: Schema.Types.ObjectId, ref: 'Note', default: null },
    // SM-2 state (PRD Section 8.2)
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    // "YYYY-MM-DD" in the student's time zone; string comparison works for <= today
    dueDate: { type: String, required: true },
    // PRD calls this is_new; "isNew" is reserved by Mongoose, so it is named isNewCard
    isNewCard: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

cardSchema.index({ deckId: 1, dueDate: 1 })

module.exports = model('Card', cardSchema)
