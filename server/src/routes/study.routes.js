const { Router } = require('express')
const mongoose = require('mongoose')

const User = require('../models/User')
const Subject = require('../models/Subject')
const Deck = require('../models/Deck')
const Card = require('../models/Card')
const Review = require('../models/Review')
const { todayIn, startOfTodayIn } = require('../utils/dates')

const router = Router()

class NotFound extends Error {
  constructor(message) {
    super(message)
    this.status = 404
  }
}

// The decks the queue may draw from: one deck, one subject's decks, or all the user's decks.
// Someone else's deck or subject is reported as not found.
async function decksInScope(userId, { deckId, subjectId }) {
  if (deckId) {
    if (!mongoose.isValidObjectId(deckId)) throw new NotFound('Deck not found')
    const deck = await Deck.findById(deckId).select('name subjectId')
    if (!deck || !(await Subject.exists({ _id: deck.subjectId, userId }))) {
      throw new NotFound('Deck not found')
    }
    return [deck]
  }
  if (subjectId) {
    if (!mongoose.isValidObjectId(subjectId) || !(await Subject.exists({ _id: subjectId, userId }))) {
      throw new NotFound('Subject not found')
    }
    return Deck.find({ subjectId }).select('name subjectId')
  }
  const subjectIds = await Subject.find({ userId }).distinct('_id')
  return Deck.find({ subjectId: { $in: subjectIds } }).select('name subjectId')
}

// What the user already studied today. A review with intervalBefore 0 is a card's
// first ever review, so it uses up the daily new-card limit instead of the review limit.
async function doneToday(userId, timezone) {
  const [row] = await Review.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), reviewedAt: { $gte: startOfTodayIn(timezone) } } },
    {
      $group: {
        _id: null,
        review: { $sum: { $cond: [{ $gt: ['$intervalBefore', 0] }, 1, 0] } },
        newCards: { $addToSet: { $cond: [{ $eq: ['$intervalBefore', 0] }, '$cardId', '$$REMOVE'] } },
      },
    },
  ])
  return { review: row?.review ?? 0, new: row?.newCards.length ?? 0 }
}

// Mongoose treats limit(0) as "no limit", so a used-up limit must skip the query
function findUpTo(limit, filter, sort) {
  return limit > 0 ? Card.find(filter).sort(sort).limit(limit) : []
}

// F9: today's study queue. Due review cards come first (most overdue first), then new
// cards (oldest first), each capped by what is left of the user's daily limits.
// Optional ?deckId= or ?subjectId= narrows the queue; limits always count the whole day.
router.get('/study/due', async (req, res) => {
  const user = await User.findById(req.userId).select('timezone dailyReviewLimit dailyNewLimit')
  if (!user) return res.status(401).json({ error: 'Please log in to continue' })

  let decks
  try {
    decks = await decksInScope(req.userId, {
      deckId: req.query.deckId,
      subjectId: req.query.subjectId,
    })
  } catch (err) {
    if (err instanceof NotFound) return res.status(404).json({ error: err.message })
    throw err
  }

  const today = todayIn(user.timezone)
  const done = await doneToday(req.userId, user.timezone)
  const reviewLeft = Math.max(0, user.dailyReviewLimit - done.review)
  const newLeft = Math.max(0, user.dailyNewLimit - done.new)

  const inDecks = { deckId: { $in: decks.map((d) => d._id) }, dueDate: { $lte: today } }
  const [reviewCards, newCards] = await Promise.all([
    findUpTo(reviewLeft, { ...inDecks, isNewCard: false }, { dueDate: 1, _id: 1 }),
    findUpTo(newLeft, { ...inDecks, isNewCard: true }, { createdAt: 1, _id: 1 }),
  ])

  const deckNames = new Map(decks.map((d) => [d._id.toString(), d.name]))
  const withDeckName = (card) => ({ ...card.toJSON(), deckName: deckNames.get(card.deckId.toString()) })

  res.json({
    date: today,
    cards: [...reviewCards, ...newCards].map(withDeckName),
    counts: { review: reviewCards.length, new: newCards.length },
    doneToday: done,
    limits: { review: user.dailyReviewLimit, new: user.dailyNewLimit },
  })
})

module.exports = router
