const request = require('supertest')
const app = require('../src/app')

const User = require('../src/models/User')
const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Card = require('../src/models/Card')
const Review = require('../src/models/Review')
const { todayIn } = require('../src/utils/dates')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

const TZ = 'Asia/Kolkata'
const auth = (token) => ({ Authorization: `Bearer ${token}` })

// "YYYY-MM-DD" n days from today in the test user's time zone
function day(n) {
  const d = new Date(`${todayIn(TZ)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function makeUser(email) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email, password: 'password123', timezone: TZ })
  const userId = signup.body.user._id
  const subject = await Subject.create({ userId, name: 'Physics' })
  const deck = await Deck.create({ subjectId: subject._id, name: 'Motion' })
  return { token: signup.body.token, userId, subjectId: subject._id, deckId: deck._id }
}

function card(deckId, front, fields = {}) {
  return Card.create({ deckId, front, back: 'answer', dueDate: day(0), ...fields })
}

const fronts = (res) => res.body.cards.map((c) => c.front)

let me

beforeEach(async () => {
  me = await makeUser('sneha@example.com')
})

describe('GET /api/study/due', () => {
  it('returns due review cards (most overdue first) and then new cards', async () => {
    await card(me.deckId, 'new card', { isNewCard: true })
    await card(me.deckId, 'due today', { isNewCard: false, dueDate: day(0) })
    await card(me.deckId, 'overdue', { isNewCard: false, dueDate: day(-3) })
    await card(me.deckId, 'not yet', { isNewCard: false, dueDate: day(2) })

    const res = await request(app).get('/api/study/due').set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body.date).toBe(day(0))
    expect(fronts(res)).toEqual(['overdue', 'due today', 'new card'])
    expect(res.body.counts).toEqual({ review: 2, new: 1 })
    expect(res.body.cards[0].deckName).toBe('Motion')
  })

  it('caps the queue by the daily limits', async () => {
    await User.updateOne({ _id: me.userId }, { dailyNewLimit: 2, dailyReviewLimit: 1 })
    for (const n of [1, 2, 3]) await card(me.deckId, `new ${n}`, { isNewCard: true })
    for (const n of [1, 2]) await card(me.deckId, `review ${n}`, { isNewCard: false })

    const res = await request(app).get('/api/study/due').set(auth(me.token))

    expect(fronts(res)).toEqual(['review 1', 'new 1', 'new 2'])
  })

  it('subtracts what was already studied today', async () => {
    await User.updateOne({ _id: me.userId }, { dailyNewLimit: 2, dailyReviewLimit: 5 })
    const studied = await card(me.deckId, 'studied new', { isNewCard: false, dueDate: day(1) })
    const base = { userId: me.userId, rating: 'good', easeAfter: 2.5 }
    // One new card studied today (twice), and one review done today
    await Review.create({ ...base, cardId: studied._id, intervalBefore: 0, intervalAfter: 1 })
    await Review.create({ ...base, cardId: studied._id, intervalBefore: 0, intervalAfter: 1 })
    await Review.create({ ...base, cardId: studied._id, intervalBefore: 3, intervalAfter: 7 })
    // A review from yesterday must not count
    await Review.create({
      ...base,
      cardId: studied._id,
      intervalBefore: 1,
      intervalAfter: 3,
      reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    })
    for (const n of [1, 2]) await card(me.deckId, `new ${n}`, { isNewCard: true })

    const res = await request(app).get('/api/study/due').set(auth(me.token))

    expect(res.body.doneToday).toEqual({ review: 1, new: 1 })
    expect(fronts(res)).toEqual(['new 1'])
  })

  it('returns an empty queue when the limits are used up', async () => {
    await User.updateOne({ _id: me.userId }, { dailyNewLimit: 1 })
    const c = await card(me.deckId, 'done', { isNewCard: false, dueDate: day(1) })
    await Review.create({
      cardId: c._id, userId: me.userId, rating: 'good', intervalBefore: 0, intervalAfter: 1, easeAfter: 2.5,
    })
    await card(me.deckId, 'another new', { isNewCard: true })

    const res = await request(app).get('/api/study/due').set(auth(me.token))

    expect(res.body.cards).toEqual([])
  })

  it('narrows to one deck or one subject', async () => {
    const otherSubject = await Subject.create({ userId: me.userId, name: 'Maths' })
    const otherDeck = await Deck.create({ subjectId: otherSubject._id, name: 'Algebra' })
    await card(me.deckId, 'physics card', { isNewCard: true })
    await card(otherDeck._id, 'maths card', { isNewCard: true })

    const all = await request(app).get('/api/study/due').set(auth(me.token))
    expect(fronts(all).sort()).toEqual(['maths card', 'physics card'])

    const byDeck = await request(app).get(`/api/study/due?deckId=${otherDeck._id}`).set(auth(me.token))
    expect(fronts(byDeck)).toEqual(['maths card'])

    const bySubject = await request(app).get(`/api/study/due?subjectId=${me.subjectId}`).set(auth(me.token))
    expect(fronts(bySubject)).toEqual(['physics card'])
  })

  it('never shows another user\'s cards', async () => {
    const other = await makeUser('other@example.com')
    await card(other.deckId, 'their card', { isNewCard: true })

    const mine = await request(app).get('/api/study/due').set(auth(me.token))
    expect(mine.body.cards).toEqual([])

    const theirDeck = await request(app).get(`/api/study/due?deckId=${other.deckId}`).set(auth(me.token))
    expect(theirDeck.status).toBe(404)

    const theirSubject = await request(app)
      .get(`/api/study/due?subjectId=${other.subjectId}`)
      .set(auth(me.token))
    expect(theirSubject.status).toBe(404)

    const bad = await request(app).get('/api/study/due?deckId=nope').set(auth(me.token))
    expect(bad.status).toBe(404)
  })

  it('needs a token', async () => {
    const res = await request(app).get('/api/study/due')
    expect(res.status).toBe(401)
  })
})
