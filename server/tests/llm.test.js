const { chatJson } = require('../src/services/llm')

// fetch is replaced so no real AI request is made
const realFetch = global.fetch
const ENV = { ...process.env }

function reply(status, content) {
  return Promise.resolve({
    ok: status < 400,
    status,
    text: async () => 'error body',
    json: async () => ({ choices: [{ message: { content } }] }),
  })
}

beforeEach(() => {
  process.env.LLM_API_KEY = 'test-key'
  process.env.LLM_MODEL = 'main-model'
  process.env.LLM_FALLBACK_MODEL = 'backup-model'
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  global.fetch = realFetch
  process.env = { ...ENV }
  jest.restoreAllMocks()
})

const modelOf = (call) => JSON.parse(call[1].body).model

describe('chatJson', () => {
  it('parses the JSON reply, even inside ```json fences', async () => {
    global.fetch = jest.fn(() => reply(200, '```json\n{"cards":[]}\n```'))
    await expect(chatJson({ system: 's', user: 'u' })).resolves.toEqual({ cards: [] })
    expect(modelOf(global.fetch.mock.calls[0])).toBe('main-model')
  })

  it('retries a busy model once, then tries the fallback model', async () => {
    global.fetch = jest
      .fn()
      .mockReturnValueOnce(reply(503))
      .mockReturnValueOnce(reply(200, 'not json'))
      .mockReturnValueOnce(reply(200, '{"ok":true}'))

    await expect(chatJson({ system: 's', user: 'u' })).resolves.toEqual({ ok: true })
    expect(global.fetch.mock.calls.map(modelOf)).toEqual(['main-model', 'main-model', 'backup-model'])
  })

  it('does not retry when the free limit is used up', async () => {
    global.fetch = jest.fn(() => reply(429))

    await expect(chatJson({ system: 's', user: 'u' })).rejects.toMatchObject({ status: 429 })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('explains a missing key', async () => {
    delete process.env.LLM_API_KEY
    await expect(chatJson({ system: 's', user: 'u' })).rejects.toMatchObject({ status: 503, expose: true })
  })
})
