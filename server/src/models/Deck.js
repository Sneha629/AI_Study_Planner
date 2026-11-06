const { Schema, model } = require('mongoose')

const deckSchema = new Schema(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // Set when the owner shares the deck (F13); sparse so many decks can have none
    shareToken: { type: String, unique: true, sparse: true },
    copiedFromDeckId: { type: Schema.Types.ObjectId, ref: 'Deck', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

module.exports = model('Deck', deckSchema)
