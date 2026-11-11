
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

  it('returns all decks as a direct array with cardCount', async () => {
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
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Arrays')
    expect(res.body[0].cardCount).toBe(1)
  })

  it('creates a new deck and returns a direct deck object', async () => {
    const res = await request(app)
      .post(`/api/subjects/${subjectId}/decks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Linked Lists' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Linked Lists')
    expect(res.body.cardCount).toBe(0)
    expect(res.body.deck).toBeUndefined()

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

  it('renames an existing deck and returns a direct deck object', async () => {
    const deck = await Deck.create({
      subjectId,
      name: 'Old Name',
    })

    const res = await request(app)
      .patch(`/api/decks/${deck._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New Name')
    expect(res.body.deck).toBeUndefined()
  })

  it('deletes a deck with its cards and reviews and returns 204', async () => {
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

    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect(await Deck.countDocuments({ _id: deck._id })).toBe(0)
    expect(await Card.countDocuments({ deckId: deck._id })).toBe(0)
    expect(await Review.countDocuments({ cardId: card._id })).toBe(0)
  })

  it('returns 404 for an invalid subject ID when getting decks', async () => {
    const res = await request(app)
      .get('/api/subjects/invalid-id/decks')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('returns 404 for an invalid subject ID when creating a deck', async () => {
    const res = await request(app)
      .post('/api/subjects/invalid-id/decks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Arrays' })

    expect(res.status).toBe(404)
  })

  it('returns 404 for an invalid deck ID when renaming', async () => {
    const res = await request(app)
      .patch('/api/decks/invalid-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' })

    expect(res.status).toBe(404)
  })

  it('returns 404 for an invalid deck ID when deleting', async () => {
    const res = await request(app)
      .delete('/api/decks/invalid-id')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
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

  it('does not allow another user to rename a deck', async () => {
    const secondUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      passwordHash: 'hashed-password',
    })

    const otherSubject = await Subject.create({
      userId: secondUser._id,
      name: 'Other Subject',
    })

    const deck = await Deck.create({
      subjectId: otherSubject._id,
      name: 'Private Deck',
    })

    const res = await request(app)
      .patch(`/api/decks/${deck._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Changed Name' })

    expect(res.status).toBe(404)

    const unchangedDeck = await Deck.findById(deck._id)
    expect(unchangedDeck.name).toBe('Private Deck')
  })

  it('does not allow another user to delete a deck', async () => {
    const secondUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      passwordHash: 'hashed-password',
    })

    const otherSubject = await Subject.create({
      userId: secondUser._id,
      name: 'Other Subject',
    })

    const deck = await Deck.create({
      subjectId: otherSubject._id,
      name: 'Private Deck',
    })

    const res = await request(app)
      .delete(`/api/decks/${deck._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(await Deck.findById(deck._id)).not.toBeNull()
  })
})
