// CLIENT_URL is read when the app loads, so set it before requiring the app
process.env.CLIENT_URL = 'https://study-planner.vercel.app/, http://localhost:5173'

const request = require('supertest')
const app = require('../src/app')

describe('CORS', () => {
  it('allows every site in CLIENT_URL, even with a trailing slash', async () => {
    for (const origin of ['https://study-planner.vercel.app', 'http://localhost:5173']) {
      const res = await request(app).get('/api/health').set('Origin', origin)
      expect(res.headers['access-control-allow-origin']).toBe(origin)
    }
  })

  it('does not allow other sites', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.com')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})
