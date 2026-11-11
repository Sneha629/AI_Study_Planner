const request = require('supertest')
const app = require('../src/app')

const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Card = require('../src/models/Card')
const Review = require('../src/models/Review')
const { todayIn, addDays } = require('../src/utils/dates')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

const TZ = 'Asia/Kolkata'
const auth = (token) => ({ Authorization: `Bearer ${token}` })

async function makeUserWithCard(email) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email, password: 'password123', timezone: TZ })
  const userId = signup.body.user._id
  const subject = await Subject.create({ userId, name: 'Physics' })
  const deck = await Deck.create({ subjectId: subject._id, name: 'Motion' })
  const card = await Card.create({ deckId: deck._id, front: 'q', back: 'a', dueDate: todayIn(TZ) })
  return { token: signup.body.token, userId, cardId: card._id.toString() }
}

const review = (user, rating, cardId = user.cardId) =>
  request(app).post(`/api/cards/${cardId}/review`).set(auth(user.token)).send({ rating })

let me

beforeEach(async () => {
  me = await makeUserWithCard('sneha@example.com')
})

describe('POST /api/cards/:id/review', () => {
  it('schedules a new card with SM-2 and logs the review', async () => {
    const res = await review(me, 'good')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      _id: me.cardId,
      isNewCard: false,
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      dueDate: addDays(todayIn(TZ), 1),
    })

    const logged = await Review.find({ cardId: me.cardId })
    expect(logged).toHaveLength(1)
    expect(logged[0]).toMatchObject({ rating: 'good', intervalBefore: 0, intervalAfter: 1, easeAfter: 2.5 })
    expect(logged[0].userId.toString()).toBe(me.userId)
  })

  it('logs the old interval for a card that is not new', async () => {
    await Card.updateOne(
      { _id: me.cardId },
      { isNewCard: false, repetitions: 2, intervalDays: 6, easeFactor: 2.5 },
    )

    const res = await review(me, 'good')

    expect(res.body.intervalDays).toBe(15)
    const [logged] = await Review.find({ cardId: me.cardId })
    expect(logged).toMatchObject({ intervalBefore: 6, intervalAfter: 15 })
  })

  it('moves the card out of today\'s queue', async () => {
    const before = await request(app).get('/api/study/due').set(auth(me.token))
    expect(before.body.cards).toHaveLength(1)

    await review(me, 'easy')

    const after = await request(app).get('/api/study/due').set(auth(me.token))
    expect(after.body.cards).toHaveLength(0)
    expect(after.body.doneToday).toEqual({ review: 0, new: 1 })
  })

  it('rejects a bad rating or extra fields', async () => {
    expect((await review(me, 'perfect')).status).toBe(400)

    const extra = await request(app)
      .post(`/api/cards/${me.cardId}/review`)
      .set(auth(me.token))
      .send({ rating: 'good', dueDate: '2000-01-01' })
    expect(extra.status).toBe(400)

    expect(await Review.countDocuments()).toBe(0)
  })

  it('returns 404 for another user\'s card or a bad id', async () => {
    const other = await makeUserWithCard('other@example.com')

    expect((await review(me, 'good', other.cardId)).status).toBe(404)
    expect((await review(me, 'good', 'nope')).status).toBe(404)
    expect((await Card.findById(other.cardId)).isNewCard).toBe(true)
  })

  it('needs a token', async () => {
    const res = await request(app).post(`/api/cards/${me.cardId}/review`).send({ rating: 'good' })
    expect(res.status).toBe(401)
  })
})
