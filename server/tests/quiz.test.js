
jest.mock('../src/services/llm', () => {
  const actual = jest.requireActual('../src/services/llm')
  return { ...actual, chatJson: jest.fn() }
})

const request = require('supertest')
const app = require('../src/app')
const { chatJson } = require('../src/services/llm')

const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Card = require('../src/models/Card')
const QuizAttempt = require('../src/models/QuizAttempt')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

beforeAll(connectTestDB)

afterEach(async () => {
  chatJson.mockReset()
  await clearTestDB()
})

afterAll(closeTestDB)

const auth = (token) => ({ Authorization: `Bearer ${token}` })

async function makeUserWithDeck(email) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({
      name: 'Test',
      email,
      password: 'password123',
      timezone: 'Asia/Kolkata',
    })

  const subject = await Subject.create({
    userId: signup.body.user._id,
    name: 'Physics',
  })

  const deck = await Deck.create({
    subjectId: subject._id,
    name: 'Motion',
  })

  return {
    token: signup.body.token,
    subjectId: subject._id.toString(),
    deckId: deck._id.toString(),
  }
}

const aiQuestions = (count = 5) => ({
  questions: Array.from({ length: count }, (_, i) => ({
    question: `Question ${i + 1}?`,
    options: [
      `Correct ${i + 1}`,
      `Wrong A ${i + 1}`,
      `Wrong B ${i + 1}`,
      `Wrong C ${i + 1}`,
    ],
    correctIndex: 0,
  })),
})

async function addCards(deckId, count = 6) {
  await Card.insertMany(
    Array.from({ length: count }, (_, i) => ({
      deckId,
      front: `Question topic ${i + 1}`,
      back: `Answer topic ${i + 1}`,
      dueDate: '2026-11-11',
    })),
  )
}

let me

beforeEach(async () => {
  me = await makeUserWithDeck('quiz@example.com')
  await addCards(me.deckId)
})

describe('POST /api/decks/:id/quiz', () => {
  it('generates a quiz and hides correct answers', async () => {
    chatJson.mockResolvedValue(aiQuestions(5))

    const res = await request(app)
      .post(`/api/decks/${me.deckId}/quiz`)
      .set(auth(me.token))
      .send({ count: 5 })

    expect(res.status).toBe(201)
    expect(res.body.total).toBe(5)
    expect(res.body.questions).toHaveLength(5)
    expect(res.body.questions[0].options).toHaveLength(4)
    expect(res.body.questions[0]).not.toHaveProperty('correctIndex')

    const saved = await QuizAttempt.findById(res.body._id)
    expect(saved).not.toBeNull()
    expect(saved.questions).toHaveLength(5)
    expect(saved.userId.toString()).toBeDefined()
    expect(saved.score).toBeNull()
  })

  it('rejects a deck with fewer than four cards', async () => {
    const deck = await Deck.create({
      subjectId: me.subjectId,
      name: 'Small deck',
    })

    await addCards(deck._id, 3)

    const res = await request(app)
      .post(`/api/decks/${deck._id}/quiz`)
      .set(auth(me.token))
      .send({ count: 5 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/at least 4 cards/)
    expect(chatJson).not.toHaveBeenCalled()
  })

  it('accepts only 5 or 10 questions', async () => {
    const res = await request(app)
      .post(`/api/decks/${me.deckId}/quiz`)
      .set(auth(me.token))
      .send({ count: 7 })

    expect(res.status).toBe(400)
    expect(chatJson).not.toHaveBeenCalled()
  })

  it('does not allow another user to generate a quiz from this deck', async () => {
    const other = await makeUserWithDeck('other-quiz@example.com')

    const res = await request(app)
      .post(`/api/decks/${me.deckId}/quiz`)
      .set(auth(other.token))
      .send({ count: 5 })

    expect(res.status).toBe(404)
    expect(chatJson).not.toHaveBeenCalled()
  })
})

describe('POST /api/quizzes/:id/submit', () => {
  async function createQuiz() {
    chatJson.mockResolvedValue(aiQuestions(5))

    const generated = await request(app)
      .post(`/api/decks/${me.deckId}/quiz`)
      .set(auth(me.token))
      .send({ count: 5 })

    expect(generated.status).toBe(201)

    return QuizAttempt.findById(generated.body._id)
  }

  it('calculates the score and returns correct answers', async () => {
    const quiz = await createQuiz()
    const answers = quiz.questions.map((q) => q.correctIndex)

    answers[0] = (answers[0] + 1) % 4

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set(auth(me.token))
      .send({ answers })

    expect(res.status).toBe(200)
    expect(res.body.score).toBe(4)
    expect(res.body.total).toBe(5)
    expect(res.body.results).toHaveLength(5)
    expect(res.body.results[0]).toHaveProperty('correctIndex')
    expect(res.body.results[0].correct).toBe(false)

    const saved = await QuizAttempt.findById(quiz._id)
    expect(saved.score).toBe(4)
    expect(saved.answers).toEqual(answers)
  })

  it('rejects an incorrect number of answers', async () => {
    const quiz = await createQuiz()

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set(auth(me.token))
      .send({ answers: [0, 1] })

    expect(res.status).toBe(400)
  })

  it('does not allow another user to submit the quiz', async () => {
    const quiz = await createQuiz()
    const other = await makeUserWithDeck('submit-other@example.com')

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set(auth(other.token))
      .send({ answers: [0, 0, 0, 0, 0] })

    expect(res.status).toBe(404)
  })

  it('rejects a second submission', async () => {
    const quiz = await createQuiz()
    const answers = quiz.questions.map((q) => q.correctIndex)

    const first = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set(auth(me.token))
      .send({ answers })

    expect(first.status).toBe(200)

    const second = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set(auth(me.token))
      .send({ answers })

    expect(second.status).toBe(409)
  })
})

describe('GET /api/decks/:id/quizzes', () => {
  it('returns the quiz history newest first', async () => {
    const first = await QuizAttempt.create({
      userId: (await require('../src/models/User').findOne({ email: 'quiz@example.com' }))._id,
      deckId: me.deckId,
      questions: aiQuestions(5).questions,
      total: 5,
      answers: [0, 0, 0, 0, 0],
      score: 4,
    })

    const second = await QuizAttempt.create({
      userId: first.userId,
      deckId: me.deckId,
      questions: aiQuestions(5).questions,
      total: 5,
      answers: [0, 0, 0, 0, 0],
      score: 5,
    })

    const res = await request(app)
      .get(`/api/decks/${me.deckId}/quizzes`)
      .set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]._id).toBe(second._id.toString())
    expect(res.body[1]._id).toBe(first._id.toString())
  })
})


describe('GET /api/quizzes/:id', () => {
  async function createSubmittedQuiz() {
    const user = await require('../src/models/User').findOne({
      email: 'quiz@example.com',
    })

    const questions = aiQuestions(5).questions
    const answers = [1, 0, 0, 0, 0]

    return QuizAttempt.create({
      userId: user._id,
      deckId: me.deckId,
      questions,
      total: 5,
      answers,
      score: 4,
    })
  }

  it('returns questions with selected and correct answers', async () => {
    const quiz = await createSubmittedQuiz()

    const res = await request(app)
      .get(`/api/quizzes/${quiz._id}`)
      .set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body.score).toBe(4)
    expect(res.body.total).toBe(5)
    expect(res.body.results).toHaveLength(5)

    expect(res.body.results[0].chosen).toBe(1)
    expect(res.body.results[0].correctIndex).toBe(0)
    expect(res.body.results[0].correct).toBe(false)

    expect(res.body.results[1].chosen).toBe(0)
    expect(res.body.results[1].correct).toBe(true)
  })

  it('does not allow another user to view quiz details', async () => {
    const quiz = await createSubmittedQuiz()
    const other = await makeUserWithDeck('history-other@example.com')

    const res = await request(app)
      .get(`/api/quizzes/${quiz._id}`)
      .set(auth(other.token))

    expect(res.status).toBe(404)
  })

  it('does not show answers for an unsubmitted quiz', async () => {
    const user = await require('../src/models/User').findOne({
      email: 'quiz@example.com',
    })

    const quiz = await QuizAttempt.create({
      userId: user._id,
      deckId: me.deckId,
      questions: aiQuestions(5).questions,
      total: 5,
    })

    const res = await request(app)
      .get(`/api/quizzes/${quiz._id}`)
      .set(auth(me.token))

    expect(res.status).toBe(409)
  })
})

