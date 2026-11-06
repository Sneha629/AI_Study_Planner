const { Schema, model } = require('mongoose')

const questionSchema = new Schema(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      validate: (v) => v.length === 4,
    },
    correctIndex: { type: Number, min: 0, max: 3, required: true },
  },
  { _id: false },
)

const quizAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deckId: { type: Schema.Types.ObjectId, ref: 'Deck', required: true },
    questions: { type: [questionSchema], required: true },
    // Chosen option index per question; empty until submitted
    answers: { type: [Number], default: [] },
    score: { type: Number, default: null },
    total: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

module.exports = model('QuizAttempt', quizAttemptSchema)
