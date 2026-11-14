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
const DAY = 24 * 60 * 60 * 1000

async function makeUser(email) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email, password: 'password123', timezone: 'Asia/Kolkata' })
  const userId = signup.body.user._id
  const subject = await Subject.create({ userId, name: 'Physics' })
  const deck = await Deck.create({ subjectId: subject._id, name: 'Newton laws' })
  return { token: signup.body.token, userId, subjectId: subject._id.toString(), deckId: deck._id.toString() }
}

let me

beforeEach(async () => {
  me = await makeUser('sneha@example.com')
})

describe('GET /api/stats/overview (dashboard numbers)', () => {
  it('adds totals, weekly activity and retention', async () => {
    const card = await Card.create({ deckId: me.deckId, front: 'q', back: 'a', dueDate: todayIn('Asia/Kolkata'), intervalDays: 30, isNewCard: false })
    const base = { cardId: card._id, userId: me.userId, intervalBefore: 1, intervalAfter: 3, easeAfter: 2.5 }
    await Review.create([
      { ...base, rating: 'good' },
      { ...base, rating: 'easy' },
      { ...base, rating: 'hard' },
      { ...base, rating: 'again' },
      { ...base, rating: 'good', reviewedAt: new Date(Date.now() - 9 * DAY) }, // last week
    ])

    const res = await request(app).get('/api/stats/overview').set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body.totals).toMatchObject({ reviews: 5, cards: 1, masteredCards: 1, dueToday: 1 })
    expect(res.body.activity).toMatchObject({ today: 4, thisWeek: 4, lastWeek: 1, last30Days: 5 })
    // 4 of 5 reviews in the last 30 days were not "Again"
    expect(res.body.retention).toEqual({ rate: 80, reviews: 5 })
    // Older fields stay for the Progress page
    expect(res.body.streak.current).toBe(1)
    expect(res.body.subjects[0].name).toBe('Physics')
  })

  it('has no retention rate before any review', async () => {
    const res = await request(app).get('/api/stats/overview').set(auth(me.token))
    expect(res.body.retention).toEqual({ rate: null, reviews: 0 })
    expect(res.body.totals.reviews).toBe(0)
  })
})

describe('GET /api/decks/shared', () => {
  it('lists only my shared decks with a link and card count', async () => {
    await request(app).post(`/api/decks/${me.deckId}/share`).set(auth(me.token))
    await Card.create({ deckId: me.deckId, front: 'q', back: 'a', dueDate: '2026-11-01' })
    await Deck.create({ subjectId: me.subjectId, name: 'Not shared' })
    const other = await makeUser('other@example.com')
    await request(app).post(`/api/decks/${other.deckId}/share`).set(auth(other.token))

    const res = await request(app).get('/api/decks/shared').set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ name: 'Newton laws', subjectName: 'Physics', cardCount: 1 })
    expect(res.body[0].shareUrl).toMatch(/\/shared\/[a-f0-9]+$/)
  })
})

describe('GET /api/search', () => {
  it('finds my subjects, decks and cards, case-insensitive', async () => {
    await Card.create({ deckId: me.deckId, front: 'What is inertia?', back: 'Resistance to change', dueDate: '2026-11-01' })
    const other = await makeUser('other@example.com')
    await Card.create({ deckId: other.deckId, front: 'Inertia secret', back: 'theirs', dueDate: '2026-11-01' })

    const cards = await request(app).get('/api/search?q=INERTIA').set(auth(me.token))
    expect(cards.body.cards.map((c) => c.front)).toEqual(['What is inertia?'])
    expect(cards.body.cards[0]).toMatchObject({ deckName: 'Newton laws', subjectId: me.subjectId })

    const named = await request(app).get('/api/search?q=newton').set(auth(me.token))
    expect(named.body.decks.map((d) => d.name)).toEqual(['Newton laws'])

    const subj = await request(app).get('/api/search?q=phys').set(auth(me.token))
    expect(subj.body.subjects.map((s) => s.name)).toEqual(['Physics'])
  })

  it('treats the query as plain text and ignores very short queries', async () => {
    const regexy = await request(app).get(`/api/search?q=${encodeURIComponent('.*')}`).set(auth(me.token))
    expect(regexy.status).toBe(200)
    expect(regexy.body.subjects).toEqual([])

    const short = await request(app).get('/api/search?q=a').set(auth(me.token))
    expect(short.body).toMatchObject({ subjects: [], decks: [], cards: [] })
  })

  it('needs a token', async () => {
    expect((await request(app).get('/api/search?q=phys')).status).toBe(401)
  })
})
