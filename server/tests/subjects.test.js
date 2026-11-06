const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const User = require('../src/models/User')
const Subject = require('../src/models/Subject')
const Note = require('../src/models/Note')
const Deck = require('../src/models/Deck')
const Card = require('../src/models/Card')
const Review = require('../src/models/Review')
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

async function createUser(email) {
  const user = await User.create({ name: 'Student', email, passwordHash: 'not-used' })
  const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET)
  return { user, authorization: `Bearer ${token}` }
}

describe('/api/subjects', () => {
  it('creates and lists only the authenticated user\'s subjects', async () => {
    const owner = await createUser('owner@example.com')
    const other = await createUser('other@example.com')
    await Subject.create({ userId: other.user._id, name: 'Private subject' })

    const created = await request(app)
      .post('/api/subjects')
      .set('Authorization', owner.authorization)
      .send({ name: '  Biology  ', examDate: '2099-12-31' })

    expect(created.status).toBe(201)
    expect(created.body.subject).toMatchObject({ name: 'Biology', examDate: '2099-12-31' })
    const listed = await request(app).get('/api/subjects').set('Authorization', owner.authorization)
    expect(listed.body.subjects).toHaveLength(1)
    expect(listed.body.subjects[0]._id).toBe(created.body.subject._id)
  })

  it('rejects past and invalid exam dates', async () => {
    const owner = await createUser('owner@example.com')

    const past = await request(app)
      .post('/api/subjects')
      .set('Authorization', owner.authorization)
      .send({ name: 'Biology', examDate: '2000-01-01' })
    const invalid = await request(app)
      .post('/api/subjects')
      .set('Authorization', owner.authorization)
      .send({ name: 'Biology', examDate: '2099-02-30' })

    expect(past.status).toBe(400)
    expect(invalid.status).toBe(400)
  })

  it('allows the owner to patch but not access another user\'s subject', async () => {
    const owner = await createUser('owner@example.com')
    const other = await createUser('other@example.com')
    const ownSubject = await Subject.create({ userId: owner.user._id, name: 'My subject' })
    const subject = await Subject.create({ userId: other.user._id, name: 'Private subject' })

    const ownPatch = await request(app)
      .patch(`/api/subjects/${ownSubject._id}`)
      .set('Authorization', owner.authorization)
      .send({ name: 'Updated subject' })
    const otherPatch = await request(app)
      .patch(`/api/subjects/${subject._id}`)
      .set('Authorization', owner.authorization)
      .send({ name: 'Changed' })
    const visible = await request(app).get('/api/subjects').set('Authorization', owner.authorization)

    expect(ownPatch.status).toBe(200)
    expect(ownPatch.body.subject.name).toBe('Updated subject')
    expect(otherPatch.status).toBe(404)
    expect(visible.body.subjects).toHaveLength(1)
    expect(visible.body.subjects[0]._id).toBe(ownSubject._id.toString())
    expect((await Subject.findById(subject._id)).name).toBe('Private subject')
  })

  it('deletes the subject and all of its notes, decks, cards, and reviews', async () => {
    const owner = await createUser('owner@example.com')
    const subject = await Subject.create({ userId: owner.user._id, name: 'Biology' })
    const note = await Note.create({
      subjectId: subject._id,
      fileName: 'lesson.txt',
      fileType: 'txt',
      extractedText: 'Cells and organisms',
    })
    const deck = await Deck.create({ subjectId: subject._id, name: 'Cells' })
    const card = await Card.create({
      deckId: deck._id,
      front: 'Cell',
      back: 'Basic unit of life',
      noteId: note._id,
      dueDate: '2099-01-01',
    })
    await Review.create({
      cardId: card._id,
      userId: owner.user._id,
      rating: 'good',
      intervalBefore: 0,
      intervalAfter: 1,
      easeAfter: 2.5,
    })

    const deleted = await request(app)
      .delete(`/api/subjects/${subject._id}`)
      .set('Authorization', owner.authorization)

    expect(deleted.status).toBe(200)
    expect(await Subject.countDocuments({ _id: subject._id })).toBe(0)
    expect(await Note.countDocuments({ subjectId: subject._id })).toBe(0)
    expect(await Deck.countDocuments({ subjectId: subject._id })).toBe(0)
    expect(await Card.countDocuments({ deckId: deck._id })).toBe(0)
    expect(await Review.countDocuments({ cardId: card._id })).toBe(0)
  })

  it('requires authentication', async () => {
    const response = await request(app).get('/api/subjects')
    expect(response.status).toBe(401)
  })
})