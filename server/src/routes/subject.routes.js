const { Router } = require('express')
const mongoose = require('mongoose')
const Subject = require('../models/Subject')
const Note = require('../models/Note')
const Deck = require('../models/Deck')
const Card = require('../models/Card')
const Review = require('../models/Review')
const User = require('../models/User')
const { todayIn } = require('../utils/dates')

const router = Router()
const subjectFields = ['name', 'examDate']

// "Today" in the user's own time zone, so an exam today is allowed even just after midnight
async function userToday(userId) {
  const user = await User.findById(userId).select('timezone')
  return todayIn(user?.timezone)
}

function validateSubject(body, today, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return [{ field: '_', message: 'Expected an object' }]
  }

  const errors = []

  if (!partial || Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.push({ field: 'name', message: 'Name is required' })
    } else if (body.name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' })
    }
  }

  if (Object.hasOwn(body, 'examDate') && body.examDate !== null) {
    const date = body.examDate
    const parsedDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T00:00:00.000Z`)
      : null

    if (!parsedDate || parsedDate.toISOString().slice(0, 10) !== date) {
      errors.push({ field: 'examDate', message: 'Exam date must be a valid YYYY-MM-DD date' })
    } else if (date < today) {
      errors.push({ field: 'examDate', message: 'Exam date cannot be in the past' })
    }
  }

  if (!partial) {
    for (const field of Object.keys(body)) {
      if (!subjectFields.includes(field)) {
        errors.push({ field, message: 'Unknown field' })
      }
    }
  } else {
    for (const field of Object.keys(body)) {
      if (!subjectFields.includes(field)) {
        errors.push({ field, message: 'Unknown field' })
      }
    }
    if (Object.keys(body).length === 0) {
      errors.push({ field: '_', message: 'At least one field is required' })
    }
  }

  return errors
}

function sendValidationError(res, errors) {
  return res.status(400).json({ error: 'Validation failed', details: errors })
}

router.get('/', async (req, res) => {
  const subjects = await Subject.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(subjects)
})

router.post('/', async (req, res) => {
  const errors = validateSubject(req.body, await userToday(req.userId))
  if (errors.length) return sendValidationError(res, errors)

  const subject = await Subject.create({
    userId: req.userId,
    name: req.body.name.trim(),
    ...(Object.hasOwn(req.body, 'examDate') ? { examDate: req.body.examDate } : {}),
  })
  res.status(201).json(subject)
})

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Subject not found' })
  }

  const errors = validateSubject(req.body, await userToday(req.userId), true)
  if (errors.length) return sendValidationError(res, errors)

  const updates = Object.fromEntries(
    Object.entries(req.body).map(([field, value]) => [field, field === 'name' ? value.trim() : value]),
  )
  const subject = await Subject.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: updates },
    { new: true, runValidators: true },
  )

  if (!subject) return res.status(404).json({ error: 'Subject not found' })
  res.json(subject)
})

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Subject not found' })
  }

  const subject = await Subject.findOne({ _id: req.params.id, userId: req.userId })
  if (!subject) return res.status(404).json({ error: 'Subject not found' })

  const decks = await Deck.find({ subjectId: subject._id }).select('_id')
  const deckIds = decks.map((deck) => deck._id)
  const cards = deckIds.length ? await Card.find({ deckId: { $in: deckIds } }).select('_id') : []
  const cardIds = cards.map((card) => card._id)

  await Promise.all([
    Note.deleteMany({ subjectId: subject._id }),
    Deck.deleteMany({ subjectId: subject._id }),
    cardIds.length ? Card.deleteMany({ _id: { $in: cardIds } }) : Promise.resolve(),
    cardIds.length ? Review.deleteMany({ cardId: { $in: cardIds }, userId: req.userId }) : Promise.resolve(),
  ])
  await subject.deleteOne()

  res.status(204).end()
})

module.exports = router