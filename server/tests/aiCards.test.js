// The AI is mocked so tests are fast, free and do not need a key
jest.mock('../src/services/llm', () => {
  const actual = jest.requireActual('../src/services/llm')
  return { ...actual, chatJson: jest.fn() }
})

const request = require('supertest')
const app = require('../src/app')
const { chatJson, LlmError } = require('../src/services/llm')
const { chunkText, pickChunks, share, planRequests, keyWords, isSimilar } = require('../src/services/cardGenerator')

const Subject = require('../src/models/Subject')
const Deck = require('../src/models/Deck')
const Note = require('../src/models/Note')
const Card = require('../src/models/Card')
const { todayIn } = require('../src/utils/dates')

const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

beforeAll(connectTestDB)
afterEach(async () => {
  chatJson.mockReset()
  await clearTestDB()
})
afterAll(closeTestDB)

const auth = (token) => ({ Authorization: `Bearer ${token}` })

async function makeUserWithNote(email, text = 'Newton first law. Inertia keeps bodies moving.') {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email, password: 'password123', timezone: 'Asia/Kolkata' })
  const subject = await Subject.create({ userId: signup.body.user._id, name: 'Physics' })
  const note = await Note.create({ subjectId: subject._id, fileName: 'chapter-3_motion.pdf', fileType: 'pdf', extractedText: text })
  return { token: signup.body.token, subjectId: subject._id.toString(), noteId: note._id.toString() }
}

const aiCards = (n, prefix = 'Q') =>
  ({ cards: Array.from({ length: n }, (_, i) => ({ front: `${prefix}${i + 1}?`, back: `Answer ${i + 1}` })) })

let me

beforeEach(async () => {
  me = await makeUserWithNote('sneha@example.com')
})

describe('cardGenerator helpers', () => {
  it('splits long text at paragraphs and walks through the note across generations', () => {
    const text = Array.from({ length: 10 }, (_, i) => `Para ${i} `.repeat(200)).join('\n\n')
    const chunks = chunkText(text, 3000)
    expect(chunks.length).toBeGreaterThan(4)
    expect(chunks.every((c) => c.length <= 3000)).toBe(true)

    const first = pickChunks(chunks, 0)
    expect(first.picked).toEqual(chunks.slice(0, 4))
    expect(first.next).toBe(4)
    expect(first.reachedEnd).toBe(false)

    // The next generation continues after those parts and wraps around at the end
    const second = pickChunks(chunks, first.next)
    expect(second.picked[0]).toBe(chunks[4])
    const last = pickChunks(chunks, chunks.length - 2)
    expect(last.picked.slice(0, 2)).toEqual(chunks.slice(-2))
    expect(last.picked[2]).toBe(chunks[0])
    expect(last.reachedEnd).toBe(true)
  })

  it('splits big counts into parallel batches of at most 10', () => {
    expect(planRequests(['only part'], 20).map((r) => r.count)).toEqual([10, 10])
    expect(planRequests(['only part'], 30).map((r) => r.count)).toEqual([10, 10, 10])
    // Batches on the same part get different focuses so they don't overlap
    const focuses = planRequests(['only part'], 20).map((r) => r.focus)
    expect(new Set(focuses).size).toBe(2)
    expect(planRequests(['a', 'b'], 10).map((r) => r.count)).toEqual([5, 5])
  })

  it('treats reworded questions as the same card', () => {
    expect(isSimilar(keyWords('What is inertia?'), keyWords('Inertia is what?'))).toBe(true)
    expect(isSimilar(keyWords('What is inertia?'), keyWords('What is momentum?'))).toBe(false)
  })

  it('shares the card count fairly', () => {
    expect(share(20, 3)).toEqual([7, 7, 6])
    expect(share(10, 1)).toEqual([10])
  })
})

describe('POST /api/notes/:id/generate', () => {
  it('returns a preview of AI cards without saving anything', async () => {
    chatJson.mockResolvedValue(aiCards(10))

    const res = await request(app).post(`/api/notes/${me.noteId}/generate`).set(auth(me.token)).send({ count: 10 })

    expect(res.status).toBe(200)
    expect(res.body.cards).toHaveLength(10)
    expect(res.body.cards[0]).toEqual({ front: 'Q1?', back: 'Answer 1' })
    expect(res.body.suggestedDeckName).toBe('Chapter 3 motion')
    expect(res.body.usedAllText).toBe(true)
    expect(await Card.countDocuments()).toBe(0)
    // A couple extra are asked for, so enough remain after dropping repeats
    expect(chatJson.mock.calls[0][0].user).toContain('Make 12 flashcards')
    expect(res.body).toMatchObject({ alreadyMade: 0, skipped: 0, lastDeckId: null, coveredAll: true })
  })

  it('drops empty and duplicate cards and never returns more than asked', async () => {
    chatJson.mockResolvedValue({
      cards: [
        { front: 'Same?', back: 'a' },
        { front: '  same?  ', back: 'b' },
        { front: '', back: 'c' },
        ...aiCards(12).cards,
      ],
    })

    const res = await request(app).post(`/api/notes/${me.noteId}/generate`).set(auth(me.token)).send({ count: 10 })

    expect(res.body.cards).toHaveLength(10)
    expect(res.body.cards.filter((c) => c.front.toLowerCase() === 'same?')).toHaveLength(1)
  })

  it('only allows 10, 20 or 30 cards', async () => {
    const res = await request(app).post(`/api/notes/${me.noteId}/generate`).set(auth(me.token)).send({ count: 500 })
    expect(res.status).toBe(400)
    expect(chatJson).not.toHaveBeenCalled()
  })

  it('shows a clear message when the AI limit is reached', async () => {
    chatJson.mockRejectedValue(new LlmError('The AI is busy or today\'s free limit is used up. Please try again later.', 429))

    const res = await request(app).post(`/api/notes/${me.noteId}/generate`).set(auth(me.token)).send({ count: 10 })

    expect(res.status).toBe(429)
    expect(res.body.error).toMatch(/free limit/)
  })

  it('shows a clear message when the AI returns nothing usable', async () => {
    chatJson.mockResolvedValue({ something: 'else' })

    const res = await request(app).post(`/api/notes/${me.noteId}/generate`).set(auth(me.token)).send({ count: 10 })

    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/could not make cards/)
  })

  it('returns 404 for another user\'s note', async () => {
    const other = await makeUserWithNote('other@example.com')
    const res = await request(app).post(`/api/notes/${other.noteId}/generate`).set(auth(me.token)).send({ count: 10 })
    expect(res.status).toBe(404)
    expect(chatJson).not.toHaveBeenCalled()
  })
})

describe('Generate more from the same note', () => {
  async function saveExisting(fronts) {
    const deck = await Deck.create({ subjectId: me.subjectId, name: 'Chapter 3 motion' })
    await Card.insertMany(
      fronts.map((front) => ({ deckId: deck._id, front, back: 'old', source: 'ai', noteId: me.noteId, dueDate: '2026-11-01' })),
    )
    return deck
  }

  const generate = (user, count = 10) =>
    request(app).post(`/api/notes/${user.noteId}/generate`).set(auth(user.token)).send({ count })

  it('tells the AI about existing cards and drops repeats, even reworded ones', async () => {
    const deck = await saveExisting(['What is inertia?', 'State Newton first law'])
    chatJson.mockResolvedValue({
      cards: [
        { front: 'What is inertia?', back: 'dup' },
        { front: 'Inertia is what?', back: 'reworded dup' },
        { front: 'What is momentum?', back: 'p = mv' },
        { front: 'What is friction?', back: 'Force opposing motion' },
      ],
    })

    const res = await generate(me)

    expect(res.status).toBe(200)
    expect(res.body.cards.map((c) => c.front)).toEqual(['What is momentum?', 'What is friction?'])
    expect(res.body).toMatchObject({ alreadyMade: 2, skipped: 2, lastDeckId: deck._id.toString() })
    const prompt = chatJson.mock.calls[0][0].user
    expect(prompt).toContain('already has')
    expect(prompt).toContain('- State Newton first law')
  })

  it('says the note is covered when the AI only repeats existing cards', async () => {
    await saveExisting(['What is inertia?'])
    chatJson.mockResolvedValue({ cards: [{ front: 'What is inertia?', back: 'again' }] })

    const res = await generate(me)

    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/fully covered/)
  })

  it('moves on to the next parts of a long note each time', async () => {
    // Six parts of ~12,000 characters each, so the note splits into six chunks
    const parts = ['PartA', 'PartB', 'PartC', 'PartD', 'PartE', 'PartF'].map((p) => `${p} `.repeat(2000))
    const long = await makeUserWithNote('long@example.com', parts.join('\n\n'))
    chatJson.mockResolvedValue(aiCards(3))

    const first = await generate(long)
    expect(first.body.coveredAll).toBe(false)
    expect((await Note.findById(long.noteId)).nextChunk).toBe(4)
    expect(chatJson.mock.calls.some((c) => c[0].user.includes('PartE'))).toBe(false)

    chatJson.mockClear()
    chatJson.mockResolvedValue(aiCards(3, 'Next'))
    const second = await generate(long)
    expect(chatJson.mock.calls.some((c) => c[0].user.includes('PartE'))).toBe(true)
    expect(second.body.coveredAll).toBe(true)
  })

  it('makes 20 cards from a short note with two parallel requests', async () => {
    chatJson.mockResolvedValueOnce(aiCards(12, 'A')).mockResolvedValueOnce(aiCards(12, 'B'))

    const res = await generate(me, 20)

    expect(chatJson).toHaveBeenCalledTimes(2)
    expect(res.body.cards).toHaveLength(20)
  })

  it('shows how many cards each note already has', async () => {
    await saveExisting(['One?', 'Two?', 'Three?'])
    const res = await request(app).get(`/api/subjects/${me.subjectId}/notes`).set(auth(me.token))
    expect(res.body[0]).toMatchObject({ cardCount: 3 })
    expect(res.body[0].nextChunk).toBeUndefined()
  })
})

describe('POST /api/notes/:id/cards', () => {
  const cards = [
    { front: 'What is inertia?', back: 'Resistance to change in motion' },
    { front: 'First law?', back: 'A body stays at rest or in motion unless a force acts' },
  ]

  it('creates a new deck and saves the cards as AI cards due today', async () => {
    const res = await request(app)
      .post(`/api/notes/${me.noteId}/cards`)
      .set(auth(me.token))
      .send({ deckName: 'Chapter 3 motion', cards })

    expect(res.status).toBe(201)
    expect(res.body.saved).toBe(2)
    expect(res.body.deck).toMatchObject({ name: 'Chapter 3 motion', subjectId: me.subjectId, cardCount: 2 })

    const saved = await Card.find({ deckId: res.body.deck._id })
    expect(saved).toHaveLength(2)
    expect(saved[0]).toMatchObject({ source: 'ai', isNewCard: true, dueDate: todayIn('Asia/Kolkata') })
    expect(saved[0].noteId.toString()).toBe(me.noteId)
  })

  it('adds to an existing deck of the same subject', async () => {
    const deck = await Deck.create({ subjectId: me.subjectId, name: 'Old deck' })
    await Card.create({ deckId: deck._id, front: 'old', back: 'card', dueDate: '2026-01-01' })

    const res = await request(app)
      .post(`/api/notes/${me.noteId}/cards`)
      .set(auth(me.token))
      .send({ deckId: deck._id.toString(), cards })

    expect(res.status).toBe(201)
    expect(res.body.deck.cardCount).toBe(3)
  })

  it('refuses a deck from another subject or user', async () => {
    const other = await makeUserWithNote('other@example.com')
    const theirDeck = await Deck.create({ subjectId: other.subjectId, name: 'Theirs' })

    const res = await request(app)
      .post(`/api/notes/${me.noteId}/cards`)
      .set(auth(me.token))
      .send({ deckId: theirDeck._id.toString(), cards })

    expect(res.status).toBe(404)
    expect(await Card.countDocuments()).toBe(0)
  })

  it('validates the body', async () => {
    const send = (body) => request(app).post(`/api/notes/${me.noteId}/cards`).set(auth(me.token)).send(body)

    expect((await send({ deckName: 'X', cards: [] })).status).toBe(400)
    expect((await send({ cards })).status).toBe(400) // no deck
    expect((await send({ deckName: 'X', deckId: 'y', cards })).status).toBe(400) // both
    expect((await send({ deckName: 'X', cards: [{ front: 'q', back: 'a', dueDate: '2000-01-01' }] })).status).toBe(400)
    expect(await Deck.countDocuments()).toBe(0)
  })
})
