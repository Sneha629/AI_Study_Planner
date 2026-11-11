const request = require('supertest')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const app = require('../src/app')
const Card = require('../src/models/Card')
const Deck = require('../src/models/Deck')
const Review = require('../src/models/Review')
const Streak = require('../src/models/Streak')
const Subject = require('../src/models/Subject')
const User = require('../src/models/User')
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

let user
let token

function dateDaysAgo(days) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

beforeEach(async () => {
  user = await User.create({
    name: 'Sneha',
    email: 'sneha@example.com',
    passwordHash: 'not-used-by-this-test',
    timezone: 'UTC',
  })
  token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET)
})

describe('GET /api/stats/overview', () => {
  it('returns streak, review heatmap, and per-subject card counts', async () => {
    const today = dateDaysAgo(0)
    const [year, month, day] = today.split('-').map(Number)
    const yesterday = dateDaysAgo(1)
    const twoDaysAgo = dateDaysAgo(2)
    const subject = await Subject.create({ userId: user._id, name: 'Physics', examDate: '2099-12-10' })
    const deck = await Deck.create({ subjectId: subject._id, name: 'Mechanics' })
    const cards = await Card.create([
      { deckId: deck._id, front: 'New', back: 'Answer', dueDate: today },
      { deckId: deck._id, front: 'Learned', back: 'Answer', dueDate: yesterday, isNewCard: false, repetitions: 1, intervalDays: 2 },
      { deckId: deck._id, front: 'Mastered', back: 'Answer', dueDate: today, isNewCard: false, repetitions: 1, intervalDays: 21 },
      { deckId: deck._id, front: 'Not mastered', back: 'Answer', dueDate: today, isNewCard: false, repetitions: 3, intervalDays: 20 },
    ])
    await Streak.create({
      userId: user._id,
      currentStreak: 5,
      longestStreak: 12,
      lastStudyDate: today,
    })
    await Review.create([
      { cardId: cards[0]._id, userId: user._id, rating: 'good', reviewedAt: new Date(`${today}T00:00:00.000Z`), intervalBefore: 0, intervalAfter: 1, easeAfter: 2.5 },
      { cardId: cards[1]._id, userId: user._id, rating: 'easy', reviewedAt: new Date(`${yesterday}T12:00:00.000Z`), intervalBefore: 1, intervalAfter: 2, easeAfter: 2.6 },
      { cardId: cards[2]._id, userId: user._id, rating: 'easy', reviewedAt: new Date(`${twoDaysAgo}T12:00:00.000Z`), intervalBefore: 1, intervalAfter: 2, easeAfter: 2.6 },
    ])

    const res = await request(app).get('/api/stats/overview').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.date).toBe(today)
    expect(res.body.streak).toEqual({ current: 3, longest: 3, studiedToday: true })
    expect(res.body.heatmap).toEqual([
      { date: twoDaysAgo, count: 1 },
      { date: yesterday, count: 1 },
      { date: today, count: 1 },
    ])
    expect(res.body.subjects).toEqual([{
      _id: subject._id.toString(),
      name: 'Physics',
      examDate: '2099-12-10',
      daysLeft: Math.round((Date.UTC(2099, 11, 10) - Date.UTC(year, month - 1, day)) / (24 * 60 * 60 * 1000)),
      totalCards: 4,
      learnedCards: 3,
      masteredCards: 1,
      dueToday: 4,
    }])
  })

  it('breaks a streak at a missing study day', async () => {
    const card = await Card.create({ deckId: new mongoose.Types.ObjectId(), front: 'Q', back: 'A', dueDate: dateDaysAgo(0) })
    await Review.create([0, 1, 3, 4].map((daysAgo) => ({
      cardId: card._id,
      userId: user._id,
      rating: 'good',
      reviewedAt: new Date(`${dateDaysAgo(daysAgo)}T00:00:00.000Z`),
      intervalBefore: 0,
      intervalAfter: 1,
      easeAfter: 2.5,
    })))

    const res = await request(app).get('/api/stats/overview').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.streak).toEqual({ current: 2, longest: 2, studiedToday: true })
  })

  it('keeps yesterday active when the user has not studied today', async () => {
    const card = await Card.create({ deckId: new mongoose.Types.ObjectId(), front: 'Q', back: 'A', dueDate: dateDaysAgo(0) })
    await Review.create({
      cardId: card._id,
      userId: user._id,
      rating: 'good',
      reviewedAt: new Date(`${dateDaysAgo(1)}T00:00:00.000Z`),
      intervalBefore: 0,
      intervalAfter: 1,
      easeAfter: 2.5,
    })

    const res = await request(app).get('/api/stats/overview').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.streak).toEqual({ current: 1, longest: 1, studiedToday: false })
  })

  it('rejects requests without authentication', async () => {
    const res = await request(app).get('/api/stats/overview')
    expect(res.status).toBe(401)
  })

  it('returns empty stats when the user has no study data', async () => {
    const res = await request(app).get('/api/stats/overview').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.streak).toEqual({ current: 0, longest: 0, studiedToday: false })
    expect(res.body.heatmap).toEqual([])
    expect(res.body.subjects).toEqual([])
  })
})
