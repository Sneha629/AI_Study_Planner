const { Schema, model } = require('mongoose')

// One document per rating; used for stats, heatmap and streaks
const reviewSchema = new Schema({
  cardId: { type: Schema.Types.ObjectId, ref: 'Card', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: String, enum: ['again', 'hard', 'good', 'easy'], required: true },
  reviewedAt: { type: Date, default: Date.now },
  intervalBefore: { type: Number, required: true },
  intervalAfter: { type: Number, required: true },
  easeAfter: { type: Number, required: true },
})

reviewSchema.index({ userId: 1, reviewedAt: 1 })

module.exports = model('Review', reviewSchema)
