const { Router } = require('express')
const Card = require('../models/Card')
const Deck = require('../models/Deck')
const Review = require('../models/Review')
const Subject = require('../models/Subject')
const User = require('../models/User')

const router = Router()
const DAY_MS = 24 * 60 * 60 * 1000
const HEATMAP_DAYS = 365

function getLocalDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function dateDaysAgo(date, days) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10)
}

function daysUntil(examDate, today) {
  if (!examDate) return null
  const [year, month, day] = examDate.split('-').map(Number)
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number)
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(todayYear, todayMonth - 1, todayDay)) / DAY_MS)
}

router.get('/stats/overview', async (req, res) => {
  const user = await User.findById(req.userId).select('timezone').lean()
  if (!user) {
    return res.status(401).json({ error: 'Your session has expired, please log in again' })
  }

  const timezone = user.timezone || 'Asia/Kolkata'
  const today = getLocalDate(new Date(), timezone)
  const heatmapStart = dateDaysAgo(today, HEATMAP_DAYS - 1)

  const [subjects, reviewCounts] = await Promise.all([
    Subject.find({ userId: req.userId }).select('name examDate').lean(),
    Review.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$reviewedAt', timezone },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ])

  const studyDates = reviewCounts.map(({ _id }) => _id).sort()
  const studyDateSet = new Set(studyDates)
  let longestStreak = 0
  let runningStreak = 0
  let previousDate = null
  for (const date of studyDates) {
    runningStreak = previousDate && dateDaysAgo(date, 1) === previousDate
      ? runningStreak + 1
      : 1
    longestStreak = Math.max(longestStreak, runningStreak)
    previousDate = date
  }

  const studiedToday = studyDateSet.has(today)
  let currentStreak = 0
  let currentDate = studiedToday ? today : dateDaysAgo(today, 1)
  while (studyDateSet.has(currentDate)) {
    currentStreak += 1
    currentDate = dateDaysAgo(currentDate, 1)
  }

  const heatmap = reviewCounts
    .filter(({ _id }) => _id >= heatmapStart && _id <= today)
    .sort((a, b) => a._id.localeCompare(b._id))
    .map(({ _id, count }) => ({ date: _id, count }))

  const subjectIds = subjects.map(({ _id }) => _id)
  const decks = subjectIds.length
    ? await Deck.find({ subjectId: { $in: subjectIds } }).select('_id subjectId').lean()
    : []
  const deckSubjects = new Map(decks.map(({ _id, subjectId }) => [_id.toString(), subjectId.toString()]))

  const cardCounts = decks.length
    ? await Card.aggregate([
        { $match: { deckId: { $in: decks.map(({ _id }) => _id) } } },
        {
          $group: {
            _id: '$deckId',
            totalCards: { $sum: 1 },
            learnedCards: { $sum: { $cond: [{ $eq: ['$isNewCard', false] }, 1, 0] } },
            masteredCards: { $sum: { $cond: [{ $gte: ['$intervalDays', 21] }, 1, 0] } },
            dueToday: { $sum: { $cond: [{ $lte: ['$dueDate', today] }, 1, 0] } },
          },
        },
      ])
    : []

  const countsBySubject = new Map()
  for (const counts of cardCounts) {
    const subjectId = deckSubjects.get(counts._id.toString())
    const current = countsBySubject.get(subjectId) || {
      totalCards: 0,
      learnedCards: 0,
      masteredCards: 0,
      dueToday: 0,
    }
    current.totalCards += counts.totalCards
    current.learnedCards += counts.learnedCards
    current.masteredCards += counts.masteredCards
    current.dueToday += counts.dueToday
    countsBySubject.set(subjectId, current)
  }

  res.json({
    date: today,
    streak: {
      current: currentStreak,
      longest: longestStreak,
      studiedToday,
    },
    heatmap,
    subjects: subjects.map(({ _id, name, examDate }) => ({
      _id: _id.toString(),
      name,
      examDate,
      daysLeft: daysUntil(examDate, today),
      totalCards: countsBySubject.get(_id.toString())?.totalCards || 0,
      learnedCards: countsBySubject.get(_id.toString())?.learnedCards || 0,
      masteredCards: countsBySubject.get(_id.toString())?.masteredCards || 0,
      dueToday: countsBySubject.get(_id.toString())?.dueToday || 0,
    })),
  })
})

module.exports = router
