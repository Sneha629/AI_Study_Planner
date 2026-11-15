import api from './client.js'

// Subjects (see docs/API.md, "Subjects")
export async function createSubject({ name, examDate, description }) {
  const body = { name, description: description ?? '' }
  if (examDate) body.examDate = examDate
  const response = await api.post('/subjects', body)
  return response.data
}

// Send only the fields that changed; examDate: null clears the exam date
export async function updateSubject(subjectId, changes) {
  const response = await api.patch(`/subjects/${subjectId}`, changes)
  return response.data
}

export async function deleteSubject(subjectId) {
  await api.delete(`/subjects/${subjectId}`)
}

// Last 7 days: [{ date, reviewed, newCards }]
export async function getSubjectActivity(subjectId, { signal } = {}) {
  const response = await api.get(`/subjects/${subjectId}/activity`, { signal })
  return response.data
}
