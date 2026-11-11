
const { z } = require('zod')
const { chatJson } = require('./llm')

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().trim().min(1),
      options: z.array(z.string().trim().min(1)).length(4),
      correctIndex: z.number().int().min(0).max(3),
    }),
  ),
})

function shuffleOptions(options, correctIndex) {
  const shuffled = options.map((option, index) => ({
    option,
    isCorrect: index === correctIndex,
  }))

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return {
    options: shuffled.map((item) => item.option),
    correctIndex: shuffled.findIndex((item) => item.isCorrect),
  }
}

async function generateQuiz(cards, count) {
  const system = [
    'You are an expert educational quiz generator.',
    'Create multiple-choice questions using only the supplied flashcards.',
    'Every question must have exactly four distinct options.',
    'Exactly one option must be correct.',
    'Avoid duplicate or nearly identical questions.',
    'Do not add facts that are not supported by the flashcards.',
    'Return valid JSON only.',
  ].join(' ')

  const user = [
    `Make exactly ${count} multiple-choice questions from these flashcards.`,
    'Return this JSON structure:',
    '{"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0}]}',
    'correctIndex must identify the correct option before shuffling.',
    'FLASHCARDS:',
    JSON.stringify(cards.map(({ front, back }) => ({ front, back }))),
  ].join('\n\n')

  const result = await chatJson({ system, user })
  const parsed = quizSchema.safeParse(result)

  if (!parsed.success) {
    const error = new Error('AI could not make a usable quiz. Please try again.')
    error.status = 502
    error.expose = true
    throw error
  }

  const questions = []
  const seen = new Set()

  for (const item of parsed.data.questions) {
    const questionKey = item.question.toLowerCase().replace(/\s+/g, ' ')

    const options = item.options.map((option) => option.trim())
    const uniqueOptions = new Set(options.map((option) => option.toLowerCase()))

    if (seen.has(questionKey) || uniqueOptions.size !== 4) continue

    seen.add(questionKey)

    const shuffled = shuffleOptions(options, item.correctIndex)

    questions.push({
      question: item.question.trim(),
      ...shuffled,
    })

    if (questions.length === count) break
  }

  if (questions.length !== count) {
    const error = new Error('AI could not make enough unique questions. Please try again.')
    error.status = 502
    error.expose = true
    throw error
  }

  return questions
}

module.exports = { generateQuiz, shuffleOptions }
