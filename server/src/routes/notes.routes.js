const { Router } = require('express')
const mongoose = require('mongoose')

const Subject = require('../models/Subject')
const Note = require('../models/Note')
const Card = require('../models/Card')
const { uploadNote } = require('../middleware/upload')
const { extractText } = require('../services/extractText')

const router = Router()

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
  const { extractedText, ...rest } = note.toJSON()
  return { ...rest, textLength: extractedText.length }
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
    { $project: { extractedText: 0, __v: 0 } },
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

module.exports = router
