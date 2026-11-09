
const { Router } = require('express')
const mongoose = require('mongoose')

const Subject = require('../models/Subject')
const Deck = require('../models/Deck')
const Card = require('../models/Card')
const Review = require('../models/Review')

const router = Router()

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

  const counts = await Card.aggregate([
    { $match: { deckId: { $in: decks.map((deck) => deck._id) } } },
    { $group: { _id: '$deckId', count: { $sum: 1 } } },
  ])

  const countMap = new Map(
    counts.map((item) => [item._id.toString(), item.count]),
  )

  const result = decks.map((deck) => ({
    ...deck,
    cardCount: countMap.get(deck._id.toString()) || 0,
  }))

  return res.json(result)
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

  const deck = await Deck.create({
    subjectId: id,
    name,
  })

  return res.status(201).json({
    ...deck.toJSON(),
    cardCount: 0,
  })
})

// PATCH rename a deck
router.patch('/decks/:id', async (req, res) => {
  const { id } = req.params
  const name = req.body?.name?.trim()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  if (!name || name.length > 100) {
    return res.status(400).json({
      error: 'Deck name is required (max 100 characters)',
    })
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

  deck.name = name
  await deck.save()

  return res.json(deck)
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