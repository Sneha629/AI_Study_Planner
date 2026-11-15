const { Router } = require('express')

const Subject = require('../models/Subject')
const Deck = require('../models/Deck')
const Card = require('../models/Card')

const router = Router()
const LIMIT = 5

// Typed text is used as plain text, never as a regex pattern
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /api/search?q=newton -> the user's matching subjects, decks and cards (top bar search)
router.get('/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
  if (q.length < 2) return res.json({ q, subjects: [], decks: [], cards: [] })

  const match = new RegExp(escapeRegex(q), 'i')
  const mySubjects = await Subject.find({ userId: req.userId }).select('name').lean()
  const subjectIds = mySubjects.map((s) => s._id)
  const subjectName = new Map(mySubjects.map((s) => [s._id.toString(), s.name]))
  const myDecks = await Deck.find({ subjectId: { $in: subjectIds } }).select('name subjectId').lean()
  const deckById = new Map(myDecks.map((d) => [d._id.toString(), d]))

  const cards = await Card.find({ deckId: { $in: myDecks.map((d) => d._id) }, $or: [{ front: match }, { back: match }] })
    .select('front back deckId')
    .limit(LIMIT)
    .lean()

  res.json({
    q,
    subjects: mySubjects.filter((s) => match.test(s.name)).slice(0, LIMIT).map((s) => ({ _id: s._id, name: s.name })),
    decks: myDecks
      .filter((d) => match.test(d.name))
      .slice(0, LIMIT)
      .map((d) => ({ _id: d._id, name: d.name, subjectId: d.subjectId, subjectName: subjectName.get(d.subjectId.toString()) })),
    cards: cards.map((c) => {
      const deck = deckById.get(c.deckId.toString())
      return { _id: c._id, front: c.front, back: c.back, deckId: c.deckId, deckName: deck.name, subjectId: deck.subjectId }
    }),
  })
})

module.exports = router
