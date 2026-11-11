
const { Router } = require('express')
const mongoose = require('mongoose')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')

const Deck = require('../models/Deck')
const Subject = require('../models/Subject')
const Card = require('../models/Card')
const QuizAttempt = require('../models/QuizAttempt')
const validate = require('../middleware/validate')
const { generateQuiz } = require('../services/quizGenerator')

const router = Router()

const quizLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.userId,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'You are creating quizzes very fast. Please wait a few minutes and try again.' },
})

const generateSchema = z
  .object({
    count: z.union([z.literal(5), z.literal(10)], {
      error: 'Count must be 5 or 10',
    }),
  })
  .strict()

const submitSchema = z
  .object({
    answers: z.array(z.number().int().min(0).max(3)).min(1).max(10),
  })
  .strict()

async function findOwnDeck(deckId, userId) {
  if (!mongoose.isValidObjectId(deckId)) return null

  const deck = await Deck.findById(deckId)
  if (!deck) return null

  const subject = await Subject.findOne({
    _id: deck.subjectId,
    userId,
  })

  return subject ? deck : null
}

// POST /api/decks/:id/quiz
router.post('/decks/:id/quiz', quizLimiter, validate(generateSchema), async (req, res) => {
  const deck = await findOwnDeck(req.params.id, req.userId)

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const cards = await Card.find({ deckId: deck._id })
    .select('front back')
    .lean()

  if (cards.length < 4) {
    return res.status(400).json({
      error: 'Add at least 4 cards to make a quiz',
    })
  }

  const questions = await generateQuiz(cards, req.body.count)

  const attempt = await QuizAttempt.create({
    userId: req.userId,
    deckId: deck._id,
    questions,
    total: questions.length,
  })

  return res.status(201).json({
    _id: attempt._id,
    deckId: attempt.deckId,
    total: attempt.total,
    questions: attempt.questions.map(({ question, options }) => ({
      question,
      options,
    })),
  })
})

// POST /api/quizzes/:id/submit
router.post('/quizzes/:id/submit', validate(submitSchema), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Quiz not found' })
  }

  const attempt = await QuizAttempt.findOne({
    _id: req.params.id,
    userId: req.userId,
  })

  if (!attempt) {
    return res.status(404).json({ error: 'Quiz not found' })
  }

  if (attempt.score !== null) {
    return res.status(409).json({ error: 'This quiz has already been submitted' })
  }

  if (req.body.answers.length !== attempt.total) {
    return res.status(400).json({
      error: `Please submit exactly ${attempt.total} answers`,
    })
  }

  const score = attempt.questions.reduce(
    (total, question, index) =>
      total + (req.body.answers[index] === question.correctIndex ? 1 : 0),
    0,
  )

  attempt.answers = req.body.answers
  attempt.score = score
  await attempt.save()

  return res.json({
    score,
    total: attempt.total,
    results: attempt.questions.map((question, index) => ({
      question: question.question,
      options: question.options,
      correctIndex: question.correctIndex,
      chosen: req.body.answers[index],
      correct: req.body.answers[index] === question.correctIndex,
    })),
  })
})


// GET /api/quizzes/:id - Get detailed quiz attempt
router.get('/quizzes/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Quiz not found' })
  }

  const attempt = await QuizAttempt.findOne({
    _id: req.params.id,
    userId: req.userId,
  }).lean()

  if (!attempt) {
    return res.status(404).json({ error: 'Quiz not found' })
  }
  if (attempt.score === null) {
  return res.status(409).json({
    error: 'This quiz has not been submitted yet',
  })
}

  return res.json({
    _id: attempt._id,
    deckId: attempt.deckId,
    score: attempt.score,
    total: attempt.total,
    createdAt: attempt.createdAt,
    results: attempt.questions.map((question, index) => ({
      question: question.question,
      options: question.options,
      correctIndex: question.correctIndex,
      chosen: attempt.answers[index] ?? null,
      correct: attempt.answers[index] !== undefined
        ? attempt.answers[index] === question.correctIndex
        : false,
    })),
  })
})


// GET /api/decks/:id/quizzes
router.get('/decks/:id/quizzes', async (req, res) => {
  const deck = await findOwnDeck(req.params.id, req.userId)

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' })
  }

  const attempts = await QuizAttempt.find({
    deckId: deck._id,
    userId: req.userId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .select('_id score total createdAt')
    .lean()

  return res.json(attempts)
})

module.exports = router
