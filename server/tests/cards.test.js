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

// Signs up a user and gives them one subject with one deck
async function makeUserWithDeck(email) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email, password: 'password123', timezone: 'Asia/Kolkata' })
  const { token, user } = signup.body
  const subject = await Subject.create({ userId: user._id, name: 'Physics' })
  const deck = await Deck.create({ subjectId: subject._id, name: 'Motion' })
  return { token, userId: user._id, deckId: deck._id.toString() }
}

const auth = (token) => ({ Authorization: `Bearer ${token}` })

let me
let other

beforeEach(async () => {
  me = await makeUserWithDeck('sneha@example.com')
  other = await makeUserWithDeck('other@example.com')
})

describe('POST /api/decks/:id/cards', () => {
  it('creates a manual card that is new and due today', async () => {
    const res = await request(app)
      .post(`/api/decks/${me.deckId}/cards`)
      .set(auth(me.token))
      .send({ front: '  What is velocity?  ', back: 'Speed with direction' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      deckId: me.deckId,
      front: 'What is velocity?',
      back: 'Speed with direction',
      source: 'manual',
      isNewCard: true,
      repetitions: 0,
      dueDate: todayIn('Asia/Kolkata'),
    })
  })

  it('rejects empty, too long and unknown fields', async () => {
    const empty = await request(app)
      .post(`/api/decks/${me.deckId}/cards`)
      .set(auth(me.token))
      .send({ front: '   ', back: 'x' })
    expect(empty.status).toBe(400)
    expect(empty.body.details[0].field).toBe('front')

    const long = await request(app)
      .post(`/api/decks/${me.deckId}/cards`)
      .set(auth(me.token))
      .send({ front: 'q', back: 'a'.repeat(2001) })
    expect(long.status).toBe(400)

    const extra = await request(app)
      .post(`/api/decks/${me.deckId}/cards`)
      .set(auth(me.token))
      .send({ front: 'q', back: 'a', easeFactor: 9 })
    expect(extra.status).toBe(400)

    expect(await Card.countDocuments()).toBe(0)
  })

  it('returns 404 for another user\'s deck or a bad id', async () => {
    const theirs = await request(app)
      .post(`/api/decks/${other.deckId}/cards`)
      .set(auth(me.token))
      .send({ front: 'q', back: 'a' })
    expect(theirs.status).toBe(404)

    const bad = await request(app)
      .post('/api/decks/not-an-id/cards')
      .set(auth(me.token))
      .send({ front: 'q', back: 'a' })
    expect(bad.status).toBe(404)
  })

  it('needs a token', async () => {
    const res = await request(app).post(`/api/decks/${me.deckId}/cards`).send({ front: 'q', back: 'a' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/decks/:id/cards', () => {
  it('lists only this deck\'s cards, oldest first', async () => {
    await request(app).post(`/api/decks/${me.deckId}/cards`).set(auth(me.token)).send({ front: 'one', back: '1' })
    await request(app).post(`/api/decks/${me.deckId}/cards`).set(auth(me.token)).send({ front: 'two', back: '2' })
    await request(app).post(`/api/decks/${other.deckId}/cards`).set(auth(other.token)).send({ front: 'x', back: 'y' })

    const res = await request(app).get(`/api/decks/${me.deckId}/cards`).set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body.map((c) => c.front)).toEqual(['one', 'two'])
  })

  it('returns 404 for another user\'s deck', async () => {
    const res = await request(app).get(`/api/decks/${other.deckId}/cards`).set(auth(me.token))
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/cards/:id', () => {
  let cardId

  beforeEach(async () => {
    const res = await request(app)
      .post(`/api/decks/${me.deckId}/cards`)
      .set(auth(me.token))
      .send({ front: 'old front', back: 'old back' })
    cardId = res.body._id
  })

  it('edits the text and keeps SM-2 progress', async () => {
    await Card.updateOne({ _id: cardId }, { repetitions: 3, intervalDays: 6, isNewCard: false })

    const res = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set(auth(me.token))
      .send({ back: 'new back' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      front: 'old front',
      back: 'new back',
      repetitions: 3,
      intervalDays: 6,
      isNewCard: false,
    })
  })

  it('rejects an empty body and SM-2 fields', async () => {
    const empty = await request(app).patch(`/api/cards/${cardId}`).set(auth(me.token)).send({})
    expect(empty.status).toBe(400)

    const sneaky = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set(auth(me.token))
      .send({ front: 'ok', dueDate: '2000-01-01' })
    expect(sneaky.status).toBe(400)
  })

  it('returns 404 when another user tries to edit it', async () => {
    const res = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set(auth(other.token))
      .send({ front: 'hacked' })

    expect(res.status).toBe(404)
    expect((await Card.findById(cardId)).front).toBe('old front')
  })
})

describe('DELETE /api/cards/:id', () => {
  it('deletes the card and its reviews', async () => {
    const created = await request(app)
      .post(`/api/decks/${me.deckId}/cards`)
      .set(auth(me.token))
      .send({ front: 'q', back: 'a' })
    const cardId = created.body._id
    await Review.create({
      cardId,
      userId: me.userId,
      rating: 'good',
      intervalBefore: 0,
      intervalAfter: 1,
      easeAfter: 2.5,
    })

    const res = await request(app).delete(`/api/cards/${cardId}`).set(auth(me.token))

    expect(res.status).toBe(204)
    expect(await Card.findById(cardId)).toBeNull()
    expect(await Review.countDocuments({ cardId })).toBe(0)
  })

  it('returns 404 for another user\'s card', async () => {
    const created = await request(app)
      .post(`/api/decks/${other.deckId}/cards`)
      .set(auth(other.token))
      .send({ front: 'q', back: 'a' })

    const res = await request(app).delete(`/api/cards/${created.body._id}`).set(auth(me.token))

    expect(res.status).toBe(404)
    expect(await Card.countDocuments()).toBe(1)
  })
})
