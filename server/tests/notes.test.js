const request = require('supertest')
const app = require('../src/app')

const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Note = require('../src/models/Note')
const Card = require('../src/models/Card')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')
const { makePdf } = require('./helpers/pdf')

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

async function makeUserWithSubject(email) {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email, password: 'password123' })
  const subject = await Subject.create({ userId: signup.body.user._id, name: 'Physics' })
  return { token: signup.body.token, subjectId: subject._id.toString() }
}

const auth = (token) => ({ Authorization: `Bearer ${token}` })

function upload(user, buffer, filename, subjectId = user.subjectId) {
  return request(app)
    .post(`/api/subjects/${subjectId}/notes`)
    .set(auth(user.token))
    .attach('file', buffer, filename)
}

let me
let other

beforeEach(async () => {
  me = await makeUserWithSubject('sneha@example.com')
  other = await makeUserWithSubject('other@example.com')
})

describe('POST /api/subjects/:id/notes', () => {
  it('uploads a PDF and saves its text', async () => {
    const res = await upload(me, makePdf('Newton first law of motion'), 'chapter1.pdf')

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      subjectId: me.subjectId,
      fileName: 'chapter1.pdf',
      fileType: 'pdf',
      textLength: 'Newton first law of motion'.length,
    })
    expect(res.body.extractedText).toBeUndefined()

    const saved = await Note.findById(res.body._id)
    expect(saved.extractedText).toBe('Newton first law of motion')
  })

  it('uploads a .txt file and tidies the text', async () => {
    const res = await upload(me, Buffer.from('Line one\r\n\r\n\r\n\r\nLine two   \n'), 'notes.TXT')

    expect(res.status).toBe(201)
    expect(res.body.fileType).toBe('txt')
    expect((await Note.findById(res.body._id)).extractedText).toBe('Line one\n\nLine two')
  })

  it('rejects other file types, fake PDFs and files with no text', async () => {
    const docx = await upload(me, Buffer.from('hello'), 'notes.docx')
    expect(docx.status).toBe(400)
    expect(docx.body.error).toMatch(/\.pdf and \.txt/)

    const fake = await upload(me, Buffer.from('not really a pdf'), 'virus.pdf')
    expect(fake.status).toBe(400)
    expect(fake.body.error).toMatch(/not a valid PDF/)

    const scanned = await upload(me, makePdf(''), 'scan.pdf')
    expect(scanned.status).toBe(400)
    expect(scanned.body.error).toMatch(/No text found/)

    const empty = await upload(me, Buffer.from('   \n  '), 'empty.txt')
    expect(empty.status).toBe(400)

    expect(await Note.countDocuments()).toBe(0)
  })

  it('rejects files over 5 MB', async () => {
    const res = await upload(me, Buffer.alloc(5 * 1024 * 1024 + 1, 'a'), 'big.txt')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/5 MB/)
  })

  it('needs a file', async () => {
    const res = await request(app)
      .post(`/api/subjects/${me.subjectId}/notes`)
      .set(auth(me.token))
      .field('name', 'no file here')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Choose a/)
  })

  it('returns 404 for another user\'s subject and 401 without a token', async () => {
    const theirs = await upload(me, Buffer.from('text'), 'a.txt', other.subjectId)
    expect(theirs.status).toBe(404)

    const noToken = await request(app)
      .post(`/api/subjects/${me.subjectId}/notes`)
      .attach('file', Buffer.from('text'), 'a.txt')
    expect(noToken.status).toBe(401)
  })
})

describe('GET /api/subjects/:id/notes and /api/notes/:id', () => {
  it('lists notes newest first without the full text', async () => {
    await upload(me, Buffer.from('first'), 'one.txt')
    await upload(me, Buffer.from('second'), 'two.txt')
    await upload(other, Buffer.from('theirs'), 'x.txt')

    const res = await request(app).get(`/api/subjects/${me.subjectId}/notes`).set(auth(me.token))

    expect(res.status).toBe(200)
    expect(res.body.map((n) => n.fileName)).toEqual(['two.txt', 'one.txt'])
    expect(res.body[0].textLength).toBe(6)
    expect(res.body[0].extractedText).toBeUndefined()
  })

  it('returns one note with its text, only to its owner', async () => {
    const created = await upload(me, Buffer.from('photosynthesis'), 'bio.txt')

    const mine = await request(app).get(`/api/notes/${created.body._id}`).set(auth(me.token))
    expect(mine.status).toBe(200)
    expect(mine.body.extractedText).toBe('photosynthesis')

    const theirs = await request(app).get(`/api/notes/${created.body._id}`).set(auth(other.token))
    expect(theirs.status).toBe(404)

    const bad = await request(app).get('/api/notes/not-an-id').set(auth(me.token))
    expect(bad.status).toBe(404)
  })
})

describe('DELETE /api/notes/:id', () => {
  it('deletes the note but keeps cards made from it', async () => {
    const created = await upload(me, Buffer.from('some notes'), 'n.txt')
    const deck = await Deck.create({ subjectId: me.subjectId, name: 'AI cards' })
    const card = await Card.create({
      deckId: deck._id,
      front: 'q',
      back: 'a',
      source: 'ai',
      noteId: created.body._id,
      dueDate: '2026-11-08',
    })

    const res = await request(app).delete(`/api/notes/${created.body._id}`).set(auth(me.token))

    expect(res.status).toBe(204)
    expect(await Note.findById(created.body._id)).toBeNull()
    expect((await Card.findById(card._id)).noteId).toBeNull()
  })

  it('returns 404 for another user\'s note', async () => {
    const created = await upload(other, Buffer.from('theirs'), 't.txt')

    const res = await request(app).delete(`/api/notes/${created.body._id}`).set(auth(me.token))

    expect(res.status).toBe(404)
    expect(await Note.countDocuments()).toBe(1)
  })
})
