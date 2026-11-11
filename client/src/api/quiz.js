
import api from './client.js'

// Generate a quiz for a deck
export const generateQuiz = async (deckId, count) => {
  const response = await api.post(`/decks/${deckId}/quiz`, { count })
  return response.data
}

// Submit quiz answers
export const submitQuiz = async (quizId, answers) => {
  const response = await api.post(`/quizzes/${quizId}/submit`, {
    answers,
  })
  return response.data
}

// Get previous quiz attempts for a deck
export const getQuizHistory = async (deckId) => {
  const response = await api.get(`/decks/${deckId}/quizzes`)
  return response.data
}

export const getQuizAttempt = async (quizId) => {
  const response = await api.get(`/quizzes/${quizId}`)
  return response.data
}
