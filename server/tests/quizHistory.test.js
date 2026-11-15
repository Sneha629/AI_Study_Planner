const request = require('supertest')
const app = require('../src/app')

const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const QuizAttempt = require('../src/models/QuizAttempt')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

const auth = (token) => ({ Authorization: `Bearer ${token}` })
const question = { question: 'Q?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }

async function makeUser(email) {
  const signup = await request(app).post('/api/auth/signup').send({ name: 'Test', email, password: 'password123' })
  const subject = await Subject.create({ userId: signup.body.user._id, name: 'Physics' })
  const deck = await Deck.create({ subjectId: subject._id, name: 'Laws of Motion' })
  return { token: signup.body.token, userId: signup.body.user._id, subjectId: subject._id, deckId: deck._id }
}

function attempt(user, score, minutesAgo, extra = {}) {
  return QuizAttempt.create({
    userId: user.userId,
    deckId: user.deckId,
    questions: Array(10).fill(question),
    answers: score === null ? [] : Array(10).fill(0),
    score,
    total: 10,
    createdAt: new Date(Date.now() - minutesAgo * 60000),
    ...extra,
  })
}

describe('GET /api/quizzes', () => {
  it('lists my submitted quizzes newest first with deck and subject names', async () => {
    const me = await makeUser('sneha@example.com')
    await attempt(me, 6, 30)
    await attempt(me, 8, 5)
    await attempt(me, null, 1) // started but not submitted
    const other = await makeUser('other@example.com')
    await attempt(other, 10, 2)

    const res = await request(app).get('/api/quizzes').set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body.map((a) => a.score)).toEqual([8, 6])
    expect(res.body[0]).toMatchObject({ deckName: 'Laws of Motion', subjectName: 'Physics', total: 10, percent: 80 })
  })

  it('leaves out quizzes of deleted decks and respects the limit', async () => {
    const me = await makeUser('sneha@example.com')
    await attempt(me, 5, 3)
    await attempt(me, 7, 2)
    await attempt(me, 9, 1, { deckId: new Deck()._id }) // deck no longer exists

    const res = await request(app).get('/api/quizzes?limit=1').set(auth(me.token))
    expect(res.body).toHaveLength(1)
    expect(res.body[0].score).toBe(7)
  })

  it('needs a token', async () => {
    expect((await request(app).get('/api/quizzes')).status).toBe(401)
  })
})
