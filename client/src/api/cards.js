import api from './client.js'

// Get all cards of a deck
export const getCards = async (deckId) => {
  const response = await api.get(`/decks/${deckId}/cards`)
  return response.data
}

// Create a card
export const createCard = async (deckId, front, back) => {
  const response = await api.post(`/decks/${deckId}/cards`, {
    front,
    back,
  })
  return response.data
}

// Edit a card
export const updateCard = async (cardId, front, back) => {
  const response = await api.patch(`/cards/${cardId}`, {
    front,
    back,
  })
  return response.data
}

// Delete a card
export const deleteCard = async (cardId) => {
  const response = await api.delete(`/cards/${cardId}`)
  return response.data
}