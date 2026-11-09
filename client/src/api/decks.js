import api from './client.js'

// Get all decks of a subject
export const getDecks = async (subjectId) => {
  const response = await api.get(`/subjects/${subjectId}/decks`)
  return response.data
}

// Create a new deck
export const createDeck = async (subjectId, name) => {
  const response = await api.post(`/subjects/${subjectId}/decks`, {
    name,
  })
  return response.data
}

// Rename an existing deck
export const renameDeck = async (deckId, name) => {
  const response = await api.patch(`/decks/${deckId}`, {
    name,
  })
  return response.data
}

// Delete a deck
export const deleteDeck = async (deckId) => {
  const response = await api.delete(`/decks/${deckId}`)
  return response.data
}