const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const User = require('../src/models/User')
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db')

const newUser = { name: 'Sneha', email: 'Sneha@Example.com', password: 'password123' }

beforeAll(connectTestDB)
afterEach(clearTestDB)
afterAll(closeTestDB)

describe('POST /api/auth/signup', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/signup').send(newUser)

    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user).toMatchObject({ name: 'Sneha', email: 'sneha@example.com', timezone: 'Asia/Kolkata' })
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('stores a bcrypt hash, not the plain password', async () => {
    await request(app).post('/api/auth/signup').send(newUser)
    const user = await User.findOne({ email: 'sneha@example.com' })

    expect(user.passwordHash).not.toBe(newUser.password)
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/)
  })

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/signup').send(newUser)
    const res = await request(app).post('/api/auth/signup').send({ ...newUser, email: 'sneha@example.com' })

    expect(res.status).toBe(409)
  })

  it('rejects invalid input with field errors', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: '', email: 'not-an-email', password: 'short', timezone: 'Mars/Base' })

    expect(res.status).toBe(400)
    const fields = res.body.details.map((d) => d.field)
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password', 'timezone']))
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(newUser)
  })

  it('returns a token for correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'sneha@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('sneha@example.com')
  })

  it('gives the same error for wrong password and unknown email', async () => {
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'sneha@example.com', password: 'wrong-pass' })
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'password123' })

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error)
  })
})

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const signup = await request(app).post('/api/auth/signup').send(newUser)
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${signup.body.token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('sneha@example.com')
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token')
    expect(res.status).toBe(401)
  })

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ userId: '6730000000000000000000aa' }, process.env.JWT_SECRET, { expiresIn: -10 })
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/auth/me', () => {
  let authorization

  beforeEach(async () => {
    const signup = await request(app).post('/api/auth/signup').send(newUser)
    authorization = `Bearer ${signup.body.token}`
  })

  it('updates the current user settings and returns the user', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authorization)
      .send({ name: 'Sneha Rao', timezone: 'Asia/Kolkata', dailyReviewLimit: 150, dailyNewLimit: 25 })

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({
      name: 'Sneha Rao',
      email: 'sneha@example.com',
      timezone: 'Asia/Kolkata',
      dailyReviewLimit: 150,
      dailyNewLimit: 25,
    })
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('rejects an invalid time zone', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authorization)
      .send({ timezone: 'Mars/Base' })

    expect(res.status).toBe(400)
    expect(res.body.details.map((detail) => detail.field)).toContain('timezone')
  })

  it.each([
    ['dailyReviewLimit', 0],
    ['dailyReviewLimit', 501],
    ['dailyNewLimit', 0],
    ['dailyNewLimit', 101],
  ])('rejects %s outside its range', async (field, value) => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authorization)
      .send({ [field]: value })

    expect(res.status).toBe(400)
  })

  it('rejects email updates', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authorization)
      .send({ email: 'other@example.com' })

    expect(res.status).toBe(400)
  })

  it('rejects password updates', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authorization)
      .send({ password: 'new-password-123' })

    expect(res.status).toBe(400)
  })

  it('rejects an empty update', async () => {
    const res = await request(app).patch('/api/auth/me').set('Authorization', authorization).send({})
    expect(res.status).toBe(400)
  })

  it('rejects requests without a token', async () => {
    const res = await request(app).patch('/api/auth/me').send({ name: 'Updated name' })
    expect(res.status).toBe(401)
  })
})
