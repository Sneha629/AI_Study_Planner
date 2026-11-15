const request = require('supertest')
const app = require('../src/app')

const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Card = require('../src/models/Card')
const Review = require('../src/models/Review')
const { todayIn } = require('../src/utils/dates')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

const auth = (token) => ({ Authorization: `Bearer ${token}` })
const TODAY = () => todayIn('Asia/Kolkata')

async function makeUser(email) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email, password: 'password123', timezone: 'Asia/Kolkata' })
  return { token: signup.body.token, userId: signup.body.user._id }
}

let me

beforeEach(async () => {
  me = await makeUser('sneha@example.com')
})

describe('Subject description', () => {
  it('saves, edits and clears an optional description', async () => {
    const created = await request(app)
      .post('/api/subjects')
      .set(auth(me.token))
      .send({ name: 'Physics', description: '  Mechanics and energy  ' })
    expect(created.status).toBe(201)
    expect(created.body.description).toBe('Mechanics and energy')

    const edited = await request(app).patch(`/api/subjects/${created.body._id}`).set(auth(me.token)).send({ description: null })
    expect(edited.body.description).toBe('')

    const tooLong = await request(app).post('/api/subjects').set(auth(me.token)).send({ name: 'X', description: 'a'.repeat(301) })
    expect(tooLong.status).toBe(400)
  })

  it('appears in stats with the deck count', async () => {
    const subject = await Subject.create({ userId: me.userId, name: 'Physics', description: 'Laws' })
    await Deck.create([{ subjectId: subject._id, name: 'A' }, { subjectId: subject._id, name: 'B' }])

    const res = await request(app).get('/api/stats/overview').set(auth(me.token))
    expect(res.body.subjects[0]).toMatchObject({ description: 'Laws', deckCount: 2 })
  })
})

describe('Decks with description and stats', () => {
  let subject

  beforeEach(async () => {
    subject = await Subject.create({ userId: me.userId, name: 'Physics' })
  })

  it('creates a deck with a description and edits only the description', async () => {
    const created = await request(app)
      .post(`/api/subjects/${subject._id}/decks`)
      .set(auth(me.token))
      .send({ name: 'Laws of Motion', description: 'Newton and momentum' })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ name: 'Laws of Motion', description: 'Newton and momentum', cardCount: 0 })

    const edited = await request(app).patch(`/api/decks/${created.body._id}`).set(auth(me.token)).send({ description: 'Updated' })
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({ name: 'Laws of Motion', description: 'Updated' })

    const empty = await request(app).patch(`/api/decks/${created.body._id}`).set(auth(me.token)).send({})
    expect(empty.status).toBe(400)
  })

  it('lists decks with mastery counts and when they were last studied', async () => {
    const deck = await Deck.create({ subjectId: subject._id, name: 'Laws' })
    const mastered = await Card.create({ deckId: deck._id, front: 'a', back: 'b', dueDate: '2099-01-01', isNewCard: false, intervalDays: 30 })
    await Card.create({ deckId: deck._id, front: 'c', back: 'd', dueDate: TODAY() })
    const at = new Date(Date.now() - 60 * 60 * 1000)
    await Review.create({ cardId: mastered._id, userId: me.userId, rating: 'good', intervalBefore: 6, intervalAfter: 30, easeAfter: 2.5, reviewedAt: at })

    const res = await request(app).get(`/api/subjects/${subject._id}/decks`).set(auth(me.token))

    expect(res.body[0]).toMatchObject({ cardCount: 2, learnedCards: 1, masteredCards: 1, dueToday: 1 })
    expect(new Date(res.body[0].lastStudiedAt).getTime()).toBe(at.getTime())
  })

  it('returns one deck with its subject name, only to its owner', async () => {
    const deck = await Deck.create({ subjectId: subject._id, name: 'Laws', shareToken: 'tok123' })

    const res = await request(app).get(`/api/decks/${deck._id}`).set(auth(me.token))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ name: 'Laws', subjectName: 'Physics', shared: true, cardCount: 0, lastStudiedAt: null })
    expect(res.body.shareToken).toBeUndefined()

    const other = await makeUser('other@example.com')
    expect((await request(app).get(`/api/decks/${deck._id}`).set(auth(other.token))).status).toBe(404)
    expect((await request(app).get('/api/decks/not-an-id').set(auth(me.token))).status).toBe(404)
  })
})

describe('GET /api/subjects/:id/activity', () => {
  it('splits the last 7 days into new cards and repeat reviews', async () => {
    const subject = await Subject.create({ userId: me.userId, name: 'Physics' })
    const deck = await Deck.create({ subjectId: subject._id, name: 'Laws' })
    const card = await Card.create({ deckId: deck._id, front: 'a', back: 'b', dueDate: TODAY() })
    const base = { cardId: card._id, userId: me.userId, rating: 'good', intervalAfter: 1, easeAfter: 2.5 }
    await Review.create([
      { ...base, intervalBefore: 0 },
      { ...base, intervalBefore: 3 },
      { ...base, intervalBefore: 6 },
    ])

    const res = await request(app).get(`/api/subjects/${subject._id}/activity`).set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(7)
    expect(res.body[6]).toEqual({ date: TODAY(), reviewed: 2, newCards: 1 })
    expect(res.body[0]).toMatchObject({ reviewed: 0, newCards: 0 })

    const other = await makeUser('other@example.com')
    expect((await request(app).get(`/api/subjects/${subject._id}/activity`).set(auth(other.token))).status).toBe(404)
  })
})
