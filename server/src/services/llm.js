// Talks to the AI model through an OpenAI-compatible chat API. Gemini and OpenRouter
// both speak this format, so switching provider only means changing server/.env:
//   LLM_API_KEY       the key (never sent to the browser)
//   LLM_BASE_URL      default: Gemini's OpenAI-compatible endpoint
//   LLM_MODEL         default: gemini-3.5-flash-lite (fast, worked best in testing)
//   LLM_FALLBACK_MODEL  comma-separated models tried in order when the main one is busy or slow
//                       (default below); set it to an empty value to turn fallbacks off
//   LLM_REASONING     optional "none" | "low" | "medium" | "high" (less = faster)

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
// Free Gemini models get busy at peak times; several backups keep AI working (checked 11 Nov 2026)
const DEFAULT_FALLBACK_MODELS = 'gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.8-flash'
const TIMEOUT_MS = 45_000

// Worth trying the backup model for these: busy, overloaded, server error, timeout
const RETRY_WITH_FALLBACK = new Set([500, 502, 503, 504])

// An error the route can show to the student as-is
class LlmError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
    this.expose = true // safe to show to the student
  }
}

function config() {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) throw new LlmError('AI is not set up on the server yet (LLM_API_KEY is missing)', 503)
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/?$/, '/')
  const model = process.env.LLM_MODEL || DEFAULT_MODEL
  const fallbacks = (process.env.LLM_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODELS)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
  const models = [...new Set([model, ...fallbacks])]
  return { apiKey, baseUrl, models, reasoning: process.env.LLM_REASONING }
}

// Turns provider failures into messages a student can act on
function errorFor(status) {
  if (status === 429) return new LlmError('The AI is busy or today\'s free limit is used up. Please try again later.', 429)
  if (status === 503) return new LlmError('The AI is very busy right now. Please try again in a minute.', 503)
  if (status === 401 || status === 403) return new LlmError('The AI key on the server is not valid. Ask the team to check LLM_API_KEY.', 502)
  return new LlmError('The AI service had a problem. Please try again.', 502)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Sends a system + user message and returns the reply parsed as JSON.
// The main model gets two tries; each fallback model then gets one, in order.
async function chatJson({ system, user }) {
  const { apiKey, baseUrl, models, reasoning } = config()
  let lastError
  for (const [index, model] of models.entries()) {
    const attempts = index === 0 ? 2 : 1
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await askModel({ apiKey, baseUrl, model, reasoning, system, user })
      } catch (err) {
        lastError = err
        if (!RETRY_WITH_FALLBACK.has(err.status)) throw err
        console.warn(`LLM ${model} attempt ${attempt} failed (${err.status}: ${err.message})`)
        if (process.env.NODE_ENV !== 'test') await sleep(1000 * attempt)
      }
    }
  }
  throw lastError
}

async function askModel({ apiKey, baseUrl, model, reasoning, system, user }) {
  const body = {
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
  if (reasoning) body.reasoning_effort = reasoning

  let response
  try {
    response = await fetch(`${baseUrl}chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    if (err.name === 'TimeoutError') throw new LlmError('The AI took too long to answer. Try fewer cards or a shorter note.', 504)
    throw new LlmError('Could not reach the AI service. Check the internet connection.', 502)
  }
  if (!response.ok) {
    console.error('LLM request failed', response.status, (await response.text()).slice(0, 500))
    throw errorFor(response.status)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? ''
  try {
    // Some models wrap JSON in ```json fences even in JSON mode
    return JSON.parse(content.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''))
  } catch {
    throw new LlmError('The AI gave an answer we could not read. Please try again.', 502)
  }
}

module.exports = { chatJson, LlmError }
