const { Router } = require('express')
const mongoose = require('mongoose')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')

const User = require('../models/User')
const Subject = require('../models/Subject')
const Deck = require('../models/Deck')
const Note = require('../models/Note')
const Card = require('../models/Card')
const { uploadNote } = require('../middleware/upload')
const validate = require('../middleware/validate')
const { extractText } = require('../services/extractText')
const { generateCards } = require('../services/cardGenerator')
const { todayIn } = require('../utils/dates')

const router = Router()

// Each generation can use up to 4 AI requests from the free quota, so cap it per student
const generateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.userId,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'You are generating cards very fast. Please wait a few minutes and try again.' },
})

const generateSchema = z
  .object({ count: z.union([z.literal(10), z.literal(20), z.literal(30)], { error: 'Count must be 10, 20 or 30' }) })
  .strict()

const saveSchema = z
  .object({
    deckId: z.string().optional(),
    deckName: z.string().trim().min(1, 'Deck name is required').max(100, 'Deck name must be at most 100 characters').optional(),
    cards: z
      .array(
        z
          .object({
            front: z.string().trim().min(1, 'Front is required').max(500, 'Front must be at most 500 characters'),
            back: z.string().trim().min(1, 'Back is required').max(2000, 'Back must be at most 2000 characters'),
          })
          .strict(),
      )
      .min(1, 'Choose at least one card to save')
      .max(50, 'You can save at most 50 cards at once'),
  })
  .strict()
  .refine((b) => Boolean(b.deckId) !== Boolean(b.deckName), {
    message: 'Send either deckId (existing deck) or deckName (new deck)',
  })

// "chapter-3_motion.pdf" -> "Chapter 3 motion"
function deckNameFrom(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Notes'
  return (base[0].toUpperCase() + base.slice(1)).slice(0, 100)
}

function ownSubject(subjectId, userId) {
  if (!mongoose.isValidObjectId(subjectId)) return null
  return Subject.exists({ _id: subjectId, userId })
}

// A note belongs to the user through its subject; otherwise treat it as not found
async function findOwnNote(noteId, userId, fields) {
  if (!mongoose.isValidObjectId(noteId)) return null
  const note = await Note.findById(noteId).select(fields)
  if (!note) return null
  return (await ownSubject(note.subjectId, userId)) ? note : null
}

// List and upload responses leave out the full text, which can be very long
function summary(note) {
  const { extractedText, nextChunk, ...rest } = note.toJSON()
  return { ...rest, textLength: extractedText.length, cardCount: 0 }
}

// F5: list a subject's notes, newest first
router.get('/subjects/:id/notes', async (req, res) => {
  if (!(await ownSubject(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Subject not found' })
  }
  const notes = await Note.aggregate([
    { $match: { subjectId: new mongoose.Types.ObjectId(req.params.id) } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $addFields: { textLength: { $strLenCP: '$extractedText' } } },
    // How many cards were already saved from each note ("12 cards made")
    {
      $lookup: {
        from: Card.collection.name,
        localField: '_id',
        foreignField: 'noteId',
        pipeline: [{ $count: 'n' }],
        as: 'made',
      },
    },
    { $addFields: { cardCount: { $ifNull: [{ $first: '$made.n' }, 0] } } },
    { $project: { extractedText: 0, made: 0, nextChunk: 0, __v: 0 } },
  ])
  res.json(notes)
})

// F5: upload a .pdf or .txt file and keep its text for AI card generation (F6)
router.post('/subjects/:id/notes', async (req, res, next) => {
  // Check the subject before reading the upload, so a wrong id fails fast
  if (!(await ownSubject(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Subject not found' })
  }
  uploadNote(req, res, async (err) => {
    if (err) return next(err)
    try {
      const extractedText = await extractText(req.file.buffer, req.file.fileType)
      const note = await Note.create({
        subjectId: req.params.id,
        fileName: req.file.originalname.slice(0, 200),
        fileType: req.file.fileType,
        extractedText,
      })
      res.status(201).json(summary(note))
    } catch (e) {
      next(e)
    }
  })
})

// F5: one note with its full text
router.get('/notes/:id', async (req, res) => {
  const note = await findOwnNote(req.params.id, req.userId)
  if (!note) return res.status(404).json({ error: 'Note not found' })
  res.json(note)
})

// F5: delete a note. Cards made from it stay, so study progress is not lost.
router.delete('/notes/:id', async (req, res) => {
  const note = await findOwnNote(req.params.id, req.userId, '_id subjectId')
  if (!note) return res.status(404).json({ error: 'Note not found' })

  await Card.updateMany({ noteId: note._id }, { noteId: null })
  await Note.deleteOne({ _id: note._id })
  res.status(204).end()
})

// F6: ask the AI for flashcards from a note. Nothing is saved yet: the student
// reviews them first and saves the ones they want with POST /notes/:id/cards.
router.post('/notes/:id/generate', generateLimiter, validate(generateSchema), async (req, res) => {
  const note = await findOwnNote(req.params.id, req.userId)
  if (!note) return res.status(404).json({ error: 'Note not found' })

  // Cards already saved from this note, newest first: the AI is told to make different ones
  const made = await Card.find({ noteId: note._id }).sort({ createdAt: -1, _id: -1 }).select('front deckId').lean()

  const result = await generateCards(note.extractedText, req.body.count, {
    avoid: made.map((c) => c.front),
    startChunk: note.nextChunk || 0,
  })
  // Next time, continue with the parts of the note that come after these
  await Note.updateOne({ _id: note._id }, { nextChunk: result.nextChunk })

  // Offer the deck the newest cards from this note went into, if it still exists in this subject
  const lastDeckId = made[0] && (await Deck.exists({ _id: made[0].deckId, subjectId: note.subjectId }))?._id

  res.json({
    noteId: note._id,
    suggestedDeckName: deckNameFrom(note.fileName),
    cards: result.cards,
    usedAllText: result.usedAllText,
    alreadyMade: made.length,
    skipped: result.skipped,
    coveredAll: result.coveredAll,
    lastDeckId: lastDeckId ?? null,
  })
})

// F6: save the reviewed AI cards, into a new deck (deckName) or an existing one (deckId)
router.post('/notes/:id/cards', validate(saveSchema), async (req, res) => {
  const note = await findOwnNote(req.params.id, req.userId, '_id subjectId')
  if (!note) return res.status(404).json({ error: 'Note not found' })

  let deck
  if (req.body.deckId) {
    // The deck must be in the same subject as the note
    deck = mongoose.isValidObjectId(req.body.deckId)
      ? await Deck.findOne({ _id: req.body.deckId, subjectId: note.subjectId })
      : null
    if (!deck) return res.status(404).json({ error: 'Deck not found in this subject' })
  } else {
    deck = await Deck.create({ subjectId: note.subjectId, name: req.body.deckName })
  }

  const user = await User.findById(req.userId).select('timezone')
  const dueDate = todayIn(user?.timezone)
  await Card.insertMany(
    req.body.cards.map((c) => ({ deckId: deck._id, front: c.front, back: c.back, source: 'ai', noteId: note._id, dueDate })),
  )
  const cardCount = await Card.countDocuments({ deckId: deck._id })

  res.status(201).json({ deck: { ...deck.toJSON(), cardCount }, saved: req.body.cards.length })
})

module.exports = router
