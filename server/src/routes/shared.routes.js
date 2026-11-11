
const { Router } = require('express')
const mongoose = require('mongoose')

const Deck = require('../models/Deck')
const Subject = require('../models/Subject')
const Card = require('../models/Card')
const User = require('../models/User')
const requireAuth = require('../middleware/auth')
const { todayIn } = require('../utils/dates')

const router = Router()

// Public: view a shared deck without login
router.get('/:token', async (req, res) => {
  const deck = await Deck.findOne({ shareToken: req.params.token }).select('_id name')

  if (!deck) {
    return res.status(404).json({ error: 'Shared deck not found' })
  }

  const cards = await Card.find({ deckId: deck._id })
    .sort({ createdAt: 1, _id: 1 })
    .select('front back')

  res.json({
    name: deck.name,
    cards,
  })
})

// Protected: copy a shared deck into the logged-in user's subject
router.post('/:token/copy', requireAuth, async (req, res) => {
  const { subjectId } = req.body

  if (!mongoose.isValidObjectId(subjectId)) {
    return res.status(400).json({ error: 'Valid subjectId is required' })
  }

  const subject = await Subject.findOne({
    _id: subjectId,
    userId: req.userId,
  })

  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' })
  }

  const sourceDeck = await Deck.findOne({
    shareToken: req.params.token,
  })

  if (!sourceDeck) {
    return res.status(404).json({ error: 'Shared deck not found' })
  }

  const user = await User.findById(req.userId).select('timezone')
  const dueDate = todayIn(user?.timezone)

  const sourceCards = await Card.find({ deckId: sourceDeck._id })
    .sort({ createdAt: 1, _id: 1 })
    .select('front back source')

  const copiedDeck = await Deck.create({
    subjectId: subject._id,
    name: sourceDeck.name,
    copiedFromDeckId: sourceDeck._id,
  })

  try {
    if (sourceCards.length > 0) {
      await Card.insertMany(
        sourceCards.map((card) => ({
          deckId: copiedDeck._id,
          front: card.front,
          back: card.back,
          source: card.source,
          noteId: null,
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          dueDate,
          isNewCard: true,
        })),
      )
    }
  } catch (error) {
    await Deck.deleteOne({ _id: copiedDeck._id })
    throw error
  }

  res.status(201).json({
    _id: copiedDeck._id,
    name: copiedDeck.name,
    subjectId: copiedDeck.subjectId,
    copiedFromDeckId: copiedDeck.copiedFromDeckId,
    cardCount: sourceCards.length,
  })
})

module.exports = router
