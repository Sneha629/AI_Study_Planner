const { Router } = require('express')
const mongoose = require('mongoose')

const User = require('../models/User')
const Subject = require('../models/Subject')
const Deck = require('../models/Deck')
const Card = require('../models/Card')
const Review = require('../models/Review')
const validate = require('../middleware/validate')
const { createCardSchema, updateCardSchema } = require('../validators/card.validators')
const { todayIn } = require('../utils/dates')

const router = Router()

// A deck belongs to the user through its subject. Returns null for a bad id,
// a missing deck or another user's deck, so all three answer 404.
async function findOwnDeck(deckId, userId) {
  if (!mongoose.isValidObjectId(deckId)) return null
  const deck = await Deck.findById(deckId)
  if (!deck) return null
  const ownsSubject = await Subject.exists({ _id: deck.subjectId, userId })
  return ownsSubject ? deck : null
}

async function findOwnCard(cardId, userId) {
  if (!mongoose.isValidObjectId(cardId)) return null
  const card = await Card.findById(cardId)
  if (!card) return null
  const deck = await findOwnDeck(card.deckId, userId)
  return deck ? card : null
}

// F4: list the cards of a deck, oldest first
router.get('/decks/:id/cards', async (req, res) => {
  const deck = await findOwnDeck(req.params.id, req.userId)
  if (!deck) return res.status(404).json({ error: 'Deck not found' })

  const cards = await Card.find({ deckId: deck._id }).sort({ createdAt: 1, _id: 1 })
  res.json(cards)
})

// F4: add a card by hand. New cards are due today so they show up in study mode.
router.post('/decks/:id/cards', validate(createCardSchema), async (req, res) => {
  const deck = await findOwnDeck(req.params.id, req.userId)
  if (!deck) return res.status(404).json({ error: 'Deck not found' })

  const user = await User.findById(req.userId).select('timezone')
  const card = await Card.create({
    deckId: deck._id,
    front: req.body.front,
    back: req.body.back,
    source: 'manual',
    dueDate: todayIn(user?.timezone),
  })
  res.status(201).json(card)
})

// F4: edit the text only; SM-2 progress stays as it is
router.patch('/cards/:id', validate(updateCardSchema), async (req, res) => {
  const card = await findOwnCard(req.params.id, req.userId)
  if (!card) return res.status(404).json({ error: 'Card not found' })

  if (req.body.front !== undefined) card.front = req.body.front
  if (req.body.back !== undefined) card.back = req.body.back
  await card.save()
  res.json(card)
})

// F4: delete a card and its review history
router.delete('/cards/:id', async (req, res) => {
  const card = await findOwnCard(req.params.id, req.userId)
  if (!card) return res.status(404).json({ error: 'Card not found' })

  await Review.deleteMany({ cardId: card._id })
  await Card.deleteOne({ _id: card._id })
  res.status(204).end()
})

module.exports = router
