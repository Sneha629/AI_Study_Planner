import api from './client.js'

// F5: notes of a subject, newest first (without the full text)
export async function listNotes(subjectId, { signal } = {}) {
  const response = await api.get(`/subjects/${subjectId}/notes`, { signal })
  return response.data
}

// F5: upload one .pdf or .txt file. onProgress gets 0-100.
export async function uploadNote(subjectId, file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const response = await api.post(`/subjects/${subjectId}/notes`, form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return response.data
}

export async function deleteNote(noteId) {
  await api.delete(`/notes/${noteId}`)
}

// F6: ask the AI for 10, 20 or 30 cards. Nothing is saved yet.
// Returns { suggestedDeckName, cards: [{ front, back }], usedAllText }
export async function generateCards(noteId, count) {
  const response = await api.post(`/notes/${noteId}/generate`, { count }, { timeout: 5 * 60 * 1000 })
  return response.data
}

// F6: save reviewed cards into a new deck ({ deckName }) or an existing one ({ deckId })
// Returns { deck, saved }
export async function saveGeneratedCards(noteId, { deckId, deckName, cards }) {
  const body = deckId ? { deckId, cards } : { deckName, cards }
  const response = await api.post(`/notes/${noteId}/cards`, body)
  return response.data
}

export async function listSubjects() {
  const response = await api.get('/subjects')
  return response.data
}
