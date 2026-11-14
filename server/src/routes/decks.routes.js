const crypto = require('crypto')
const { Router } = require('express')
const mongoose = require('mongoose')

const Subject = require('../models/Subject')
const Deck = require('../models/Deck')
const Card = require('../models/Card')
const Review = require('../models/Review')
const User = require('../models/User')
const { todayIn } = require('../utils/dates')

const router = Router()

// Card counts and the last review time for each deck: Map(deckId -> stats)
async function deckStats(deckIds, userId) {
  const user = await User.findById(userId).select('timezone')
  const today = todayIn(user?.timezone)
  const counts = await Card.aggregate([
    { $match: { deckId: { $in: deckIds } } },
    {
      $group: {
        _id: '$deckId',
        cardCount: { $sum: 1 },
        learnedCards: { $sum: { $cond: ['$isNewCard', 0, 1] } },
        masteredCards: { $sum: { $cond: [{ $gte: ['$intervalDays', 21] }, 1, 0] } },
        dueToday: { $sum: { $cond: [{ $lte: ['$dueDate', today] }, 1, 0] } },
        cardIds: { $push: '$_id' },
      },
    },
  ])
  const deckOfCard = new Map()
  for (const row of counts) for (const id of row.cardIds) deckOfCard.set(id.toString(), row._id.toString())
  const last = deckOfCard.size
    ? await Review.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), cardId: { $in: counts.flatMap((r) => r.cardIds) } } },
        { $group: { _id: '$cardId', at: { $max: '$reviewedAt' } } },
      ])
    : []
  const lastByDeck = new Map()
  for (const r of last) {
    const deckId = deckOfCard.get(r._id.toString())
    if (!lastByDeck.has(deckId) || r.at > lastByDeck.get(deckId)) lastByDeck.set(deckId, r.at)
  }
  const stats = new Map()
  for (const id of deckIds) {
    const row = counts.find((r) => r._id.toString() === id.toString())
    stats.set(id.toString(), {
      cardCount: row?.cardCount || 0,
      learnedCards: row?.learnedCards || 0,
      masteredCards: row?.masteredCards || 0,
      dueToday: row?.dueToday || 0,
      lastStudiedAt: lastByDeck.get(id.toString()) || null,
    })
  }
  return stats
}

function cleanDescription(value) {
  if (value === undefined) return undefined
  if (value === null) return ''
  if (typeof value !== 'string') return false
  const text = value.trim()
  return text.length > 300 ? false : text
}

function shareUrlFor(token) {
  const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '')
  return `${baseUrl}/shared/${token}`
}

// GET the decks the user is sharing (Shared Decks page), newest first
router.get('/decks/shared', async (req, res) => {
  const subjects = await Subject.find({ userId: req.userId }).select('name').lean()
  const subjectName = new Map(subjects.map((s) => [s._id.toString(), s.name]))
  const decks = await Deck.find({ subjectId: { $in: subjects.map((s) => s._id) }, shareToken: { $exists: true, $ne: null } })
    .sort({ createdAt: -1, _id: -1 })
    .lean()
  const counts = await Card.aggregate([
    { $match: { deckId: { $in: decks.map((d) => d._id) } } },
    { $group: { _id: '$deckId', n: { $sum: 1 } } },
  ])
  const countOf = new Map(counts.map((c) => [c._id.toString(), c.n]))

  res.json(
    decks.map((d) => ({
      _id: d._id,
      name: d.name,
      subjectId: d.subjectId,
      subjectName: subjectName.get(d.subjectId.toString()),
      cardCount: countOf.get(d._id.toString()) || 0,
      shareToken: d.shareToken,
      shareUrl: shareUrlFor(d.shareToken),
    })),
  )
})

// POST generate or retrieve a deck share link
router.post('/decks/:id/share', async (req, res) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const deck = await Deck.findById(id)

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const subject = await Subject.findOne({
    _id: deck.subjectId,
    userId: req.userId,
  })

  if (!subject) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  if (!deck.shareToken) {
    deck.shareToken = crypto.randomBytes(24).toString('hex')
    await deck.save()
  }

  // Share links point at the first site listed in CLIENT_URL
  const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '')
  const shareUrl = `${baseUrl}/shared/${deck.shareToken}`

  return res.json({
    shareToken: deck.shareToken,
    shareUrl,
  })
})

// DELETE disable deck sharing
router.delete('/decks/:id/share', async (req, res) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const deck = await Deck.findById(id)

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const subject = await Subject.findOne({
    _id: deck.subjectId,
    userId: req.userId,
  })

  if (!subject) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  deck.shareToken = undefined
  await deck.save()

  return res.json({ message: 'Deck sharing disabled' })
})


// GET all decks of a subject with card count
router.get('/subjects/:id/decks', async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Subject not found' })
  }

  const subject = await Subject.findOne({
    _id: id,
    userId: req.userId,
  })

  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' })
  }

  const decks = await Deck.find({ subjectId: id }).lean()
  const stats = await deckStats(decks.map((deck) => deck._id), req.userId)

  // cardCount, learned/mastered/due counts and lastStudiedAt for each deck
  return res.json(decks.map((deck) => ({ ...deck, ...stats.get(deck._id.toString()) })))
})

// POST create a new deck
router.post('/subjects/:id/decks', async (req, res) => {
  const { id } = req.params
  const name = req.body?.name?.trim()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Subject not found' })
  }

  if (!name || name.length > 100) {
    return res.status(400).json({
      error: 'Deck name is required (max 100 characters)',
    })
  }

  const subject = await Subject.findOne({
    _id: id,
    userId: req.userId,
  })

  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' })
  }

  const description = cleanDescription(req.body?.description)
  if (description === false) {
    return res.status(400).json({ error: 'Description must be text, at most 300 characters' })
  }

  const deck = await Deck.create({
    subjectId: id,
    name,
    description: description ?? '',
  })

  return res.status(201).json({
    ...deck.toJSON(),
    cardCount: 0,
    learnedCards: 0,
    masteredCards: 0,
    dueToday: 0,
    lastStudiedAt: null,
  })
})

// PATCH rename a deck and/or change its description
router.patch('/decks/:id', async (req, res) => {
  const { id } = req.params
  const hasName = req.body?.name !== undefined
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const description = cleanDescription(req.body?.description)

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  if (!hasName && description === undefined) {
    return res.status(400).json({ error: 'Send a name or a description to update' })
  }
  if (hasName && (!name || name.length > 100)) {
    return res.status(400).json({
      error: 'Deck name is required (max 100 characters)',
    })
  }
  if (description === false) {
    return res.status(400).json({ error: 'Description must be text, at most 300 characters' })
  }

  const deck = await Deck.findById(id)

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const subject = await Subject.findOne({
    _id: deck.subjectId,
    userId: req.userId,
  })

  if (!subject) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  if (hasName) deck.name = name
  if (description !== undefined) deck.description = description
  await deck.save()

  return res.json(deck)
})

// GET one deck for the deck page: subject name, card counts, last studied, shared or not
router.get('/decks/:id', async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Deck not found' })
  }
  const deck = await Deck.findById(id).lean()
  const subject = deck && (await Subject.findOne({ _id: deck.subjectId, userId: req.userId }).select('name').lean())
  if (!subject) {
    return res.status(404).json({ error: 'Deck not found' })
  }
  const stats = await deckStats([deck._id], req.userId)
  const { shareToken, ...rest } = deck
  return res.json({ ...rest, subjectName: subject.name, shared: Boolean(shareToken), ...stats.get(deck._id.toString()) })
})

// DELETE deck, its cards and their reviews
router.delete('/decks/:id', async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const deck = await Deck.findById(id)

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const subject = await Subject.findOne({
    _id: deck.subjectId,
    userId: req.userId,
  })

  if (!subject) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const cards = await Card.find({ deckId: id }).select('_id')
  const cardIds = cards.map((card) => card._id)

  await Review.deleteMany({ cardId: { $in: cardIds } })
  await Card.deleteMany({ deckId: id })
  await Deck.deleteOne({ _id: id })

  return res.status(204).end()
})

module.exports = router