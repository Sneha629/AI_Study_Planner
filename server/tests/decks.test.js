
const request = require('supertest')
const app = require('../src/app')

const User = require('../src/models/User')
const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Card = require('../src/models/Card')
const Review = require('../src/models/Review')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

let token
let userId
let subjectId

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

beforeEach(async () => {
  const signup = await request(app).post('/api/auth/signup').send({
    name: 'Khushi',
    email: 'khushi@example.com',
    password: 'password123',
  })

  token = signup.body.token
  userId = signup.body.user._id

  const subject = await Subject.create({
    userId,
    name: 'Data Structures',
  })

  subjectId = subject._id.toString()
})

describe('Decks API', () => {
  it('rejects requests without authentication', async () => {
    const res = await request(app).get(`/api/subjects/${subjectId}/decks`)

    expect(res.status).toBe(401)
  })

  it('returns all decks with cardCount', async () => {
    const deck = await Deck.create({
      subjectId,
      name: 'Arrays',
    })

    await Card.create({
      deckId: deck._id,
      front: 'What is an array?',
      back: 'A collection of elements',
      dueDate: '2026-11-06',
    })

    const res = await request(app)
      .get(`/api/subjects/${subjectId}/decks`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.decks).toHaveLength(1)
    expect(res.body.decks[0].name).toBe('Arrays')
    expect(res.body.decks[0].cardCount).toBe(1)
  })

  it('creates a new deck', async () => {
    const res = await request(app)
      .post(`/api/subjects/${subjectId}/decks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Linked Lists' })

    expect(res.status).toBe(201)
    expect(res.body.deck.name).toBe('Linked Lists')
    expect(res.body.deck.cardCount).toBe(0)

    const deck = await Deck.findOne({ name: 'Linked Lists' })
    expect(deck).toBeDefined()
  })

  it('rejects an empty deck name', async () => {
    const res = await request(app)
      .post(`/api/subjects/${subjectId}/decks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' })

    expect(res.status).toBe(400)
  })

  it('renames an existing deck', async () => {
    const deck = await Deck.create({
      subjectId,
      name: 'Old Name',
    })

    const res = await request(app)
      .patch(`/api/decks/${deck._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.deck.name).toBe('New Name')
  })

  it('deletes a deck along with its cards and reviews', async () => {
    const deck = await Deck.create({
      subjectId,
      name: 'Algorithms',
    })

    const card = await Card.create({
      deckId: deck._id,
      front: 'What is sorting?',
      back: 'Arranging elements in order',
      dueDate: '2026-11-06',
    })

    await Review.create({
      cardId: card._id,
      userId,
      rating: 'good',
      intervalBefore: 0,
      intervalAfter: 1,
      easeAfter: 2.5,
    })

    const res = await request(app)
      .delete(`/api/decks/${deck._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(await Deck.countDocuments({ _id: deck._id })).toBe(0)
    expect(await Card.countDocuments({ deckId: deck._id })).toBe(0)
    expect(await Review.countDocuments({ cardId: card._id })).toBe(0)
  })

  it('does not allow another user to access the subject decks', async () => {
    const secondUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      passwordHash: 'hashed-password',
    })

    const otherSubject = await Subject.create({
      userId: secondUser._id,
      name: 'Other Subject',
    })

    const res = await request(app)
      .get(`/api/subjects/${otherSubject._id}/decks`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
