const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const User = require('../src/models/User')
const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Card = require('../src/models/Card')
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')
const { todayIn, addDays } = require('../src/utils/dates')

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

async function createUser(email, dailyNewLimit = 20) {
  const user = await User.create({
    name: 'Student',
    email,
    passwordHash: 'not-used',
    timezone: 'Asia/Kolkata',
    dailyNewLimit,
  })

  const token = jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET
  )

  return { user, authorization: `Bearer ${token}` }
}

async function createNewCards(subjectId, count) {
  const deck = await Deck.create({
    subjectId,
    name: 'Test Deck',
  })

  const cards = Array.from({ length: count }, (_, index) => ({
    deckId: deck._id,
    front: `Question ${index + 1}`,
    back: `Answer ${index + 1}`,
    dueDate: todayIn('Asia/Kolkata'),
    isNewCard: true,
  }))

  await Card.insertMany(cards)
}

describe('GET /api/subjects/:id/plan', () => {
  it('returns the exam plan and next seven days schedule', async () => {
    const owner = await createUser('owner@example.com')
    const examDate = addDays(todayIn('Asia/Kolkata'), 12)

    const subject = await Subject.create({
      userId: owner.user._id,
      name: 'Biology',
      examDate,
    })

    await createNewCards(subject._id, 4)

    const response = await request(app)
      .get(`/api/subjects/${subject._id}/plan`)
      .set('Authorization', owner.authorization)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      daysLeft: 12,
      totalCards: 4,
      newCardsLeft: 4,
      dueToday: 4,
      newPerDay: 1,
      status: 'on-track',
    })

    expect(response.body.schedule).toHaveLength(7)

    response.body.schedule.forEach((day) => {
      expect(day).toEqual({
        date: expect.any(String),
        newCards: expect.any(Number),
        reviews: expect.any(Number),
      })
    })
  })

  it('returns behind when required new cards exceed daily limit', async () => {
    const owner = await createUser('behind@example.com', 5)
    const examDate = addDays(todayIn('Asia/Kolkata'), 5)

    const subject = await Subject.create({
      userId: owner.user._id,
      name: 'Mathematics',
      examDate,
    })

    await createNewCards(subject._id, 18)

    const response = await request(app)
      .get(`/api/subjects/${subject._id}/plan`)
      .set('Authorization', owner.authorization)

    expect(response.status).toBe(200)
    expect(response.body.daysLeft).toBe(5)
    expect(response.body.dueToday).toBe(18)
    expect(response.body.newPerDay).toBe(9)
    expect(response.body.status).toBe('behind')
  })

  it('returns no-exam when the subject has no exam date', async () => {
    const owner = await createUser('noexam@example.com')

    const subject = await Subject.create({
      userId: owner.user._id,
      name: 'Physics',
      examDate: null,
    })

    await createNewCards(subject._id, 3)

    const response = await request(app)
      .get(`/api/subjects/${subject._id}/plan`)
      .set('Authorization', owner.authorization)

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('no-exam')
    expect(response.body.totalCards).toBe(3)
    expect(response.body.dueToday).toBe(3)
    expect(response.body.daysLeft).toBeNull()
    expect(response.body.newPerDay).toBeNull()
  })

  it('does not allow access to another user subject', async () => {
    const owner = await createUser('owner2@example.com')
    const other = await createUser('other@example.com')

    const subject = await Subject.create({
      userId: other.user._id,
      name: 'Private subject',
      examDate: addDays(todayIn('Asia/Kolkata'), 10),
    })

    const response = await request(app)
      .get(`/api/subjects/${subject._id}/plan`)
      .set('Authorization', owner.authorization)

    expect(response.status).toBe(404)
  })

  it('returns 404 for an invalid subject ID', async () => {
    const owner = await createUser('invalid@example.com')

    const response = await request(app)
      .get('/api/subjects/invalid-id/plan')
      .set('Authorization', owner.authorization)

    expect(response.status).toBe(404)
  })

  it('requires authentication', async () => {
    const response = await request(app)
      .get('/api/subjects/507f1f77bcf86cd799439011/plan')

    expect(response.status).toBe(401)
  })
})