
const request = require('supertest')
const app = require('../src/app')

const User = require('../src/models/User')
const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Card = require('../src/models/Card')
const mongoose = require('mongoose')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

let token
let userId
let subjectId
let deckId

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

  const deck = await Deck.create({
    subjectId,
    name: 'Arrays',
  })

  deckId = deck._id.toString()
})

describe('F13 Share Deck API', () => {
  it('creates a share link for the deck owner', async () => {
    const res = await request(app)
      .post(`/api/decks/${deckId}/share`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.shareToken).toBeDefined()
    expect(res.body.shareUrl).toContain(`/shared/${res.body.shareToken}`)

    const deck = await Deck.findById(deckId)
    expect(deck.shareToken).toBe(res.body.shareToken)
  })

  it('returns the same share link when sharing again', async () => {
    const first = await request(app)
      .post(`/api/decks/${deckId}/share`)
      .set('Authorization', `Bearer ${token}`)

    const second = await request(app)
      .post(`/api/decks/${deckId}/share`)
      .set('Authorization', `Bearer ${token}`)

    expect(second.body.shareToken).toBe(first.body.shareToken)
  })

  it('rejects sharing without authentication', async () => {
    const res = await request(app).post(`/api/decks/${deckId}/share`)
    expect(res.status).toBe(401)
  })

  it('does not allow another user to share the deck', async () => {
    const otherUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      passwordHash: 'hashed-password',
    })

    const otherSubject = await Subject.create({
      userId: otherUser._id,
      name: 'Other Subject',
    })

    const otherDeck = await Deck.create({
      subjectId: otherSubject._id,
      name: 'Other Deck',
    })

    const res = await request(app)
      .post(`/api/decks/${otherDeck._id}/share`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)

    const unchangedDeck = await Deck.findById(otherDeck._id)
    expect(unchangedDeck.shareToken).toBeFalsy()
  })

  it('disables sharing and invalidates the public link', async () => {
    const share = await request(app)
      .post(`/api/decks/${deckId}/share`)
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .delete(`/api/decks/${deckId}/share`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    const publicRes = await request(app)
      .get(`/api/shared/${share.body.shareToken}`)

    expect(publicRes.status).toBe(404)
  })

  it('shows a shared deck publicly without personal information', async () => {
    const deck = await Deck.findById(deckId)
    deck.shareToken = 'public-test-token'
    await deck.save()

    await Card.create({
      deckId,
      front: 'What is an array?',
      back: 'A collection of elements',
      source: 'manual',
      dueDate: '2026-11-10',
    })

    const res = await request(app).get('/api/shared/public-test-token')

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Arrays')
    expect(res.body.cards).toHaveLength(1)
    expect(res.body.cards[0].front).toBe('What is an array?')
    expect(res.body.cards[0].back).toBe('A collection of elements')
    expect(res.body.cards[0].easeFactor).toBeUndefined()
    expect(res.body.userId).toBeUndefined()
  })

  it('returns 404 for an invalid share token', async () => {
    const res = await request(app).get('/api/shared/invalid-token')
    expect(res.status).toBe(404)
  })

  it('copies a shared deck into the logged-in user subject', async () => {
    const deck = await Deck.findById(deckId)
    deck.shareToken = 'copy-test-token'
    await deck.save()

    await Card.create({
      deckId,
      front: 'What is an array?',
      back: 'A collection of elements',
      source: 'ai',
      noteId: new mongoose.Types.ObjectId(),
      easeFactor: 3,
      intervalDays: 10,
      repetitions: 4,
      dueDate: '2026-11-10',
      isNewCard: false,
    })

    const res = await request(app)
      .post('/api/shared/copy-test-token/copy')
      .set('Authorization', `Bearer ${token}`)
      .send({ subjectId })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Arrays')
    expect(res.body.copiedFromDeckId).toBe(deckId)
    expect(res.body.cardCount).toBe(1)

    const copiedCard = await Card.findOne({
      deckId: res.body._id,
    })

    expect(copiedCard.front).toBe('What is an array?')
    expect(copiedCard.back).toBe('A collection of elements')
    expect(copiedCard.source).toBe('ai')
    expect(copiedCard.noteId).toBeNull()
    expect(copiedCard.easeFactor).toBe(2.5)
    expect(copiedCard.intervalDays).toBe(0)
    expect(copiedCard.repetitions).toBe(0)
    expect(copiedCard.isNewCard).toBe(true)
  })

  it('requires authentication to copy a shared deck', async () => {
    const res = await request(app)
      .post('/api/shared/any-token/copy')
      .send({ subjectId })

    expect(res.status).toBe(401)
  })

  it('does not allow copying into another user subject', async () => {
    const deck = await Deck.findById(deckId)
    deck.shareToken = 'private-copy-token'
    await deck.save()

    const otherUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      passwordHash: 'hashed-password',
    })

    const otherSubject = await Subject.create({
      userId: otherUser._id,
      name: 'Other Subject',
    })

    const res = await request(app)
      .post('/api/shared/private-copy-token/copy')
      .set('Authorization', `Bearer ${token}`)
      .send({ subjectId: otherSubject._id })

    expect(res.status).toBe(404)
  })
})
