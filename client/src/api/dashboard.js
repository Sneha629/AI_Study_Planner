import api from './client.js'

// Everything the dashboard and progress pages need (see docs/API.md, "Stats")
export async function getOverview({ signal } = {}) {
  const response = await api.get('/stats/overview', { signal })
  return response.data
}

// Decks the user is sharing, with their public link
export async function getSharedDecks({ signal } = {}) {
  const response = await api.get('/decks/shared', { signal })
  return response.data
}

// Top bar search over the user's subjects, decks and cards
export async function search(q, { signal } = {}) {
  const response = await api.get('/search', { params: { q }, signal })
  return response.data
}

export async function listSubjects({ signal } = {}) {
  const response = await api.get('/subjects', { signal })
  return response.data
}
