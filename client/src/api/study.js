import api from './client.js'

// Today's queue. Pass { deckId } or { subjectId } to study just that deck or subject.
// Returns { date, cards, counts, doneToday, limits } (see docs/API.md, "Study queue").
// `signal` (from an AbortController) cancels the request if the page closes first.
export async function getDueCards({ deckId, subjectId, signal } = {}) {
  const params = {}
  if (deckId) params.deckId = deckId
  if (subjectId) params.subjectId = subjectId
  const response = await api.get('/study/due', { params, signal })
  return response.data
}

// Rate a card after seeing the answer: 'again' | 'hard' | 'good' | 'easy'. Returns the updated card.
export async function reviewCard(cardId, rating) {
  const response = await api.post(`/cards/${cardId}/review`, { rating })
  return response.data
}
