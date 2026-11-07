
import { useState } from 'react'

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [subjectName, setSubjectName] = useState('')
  const [examDate, setExamDate] = useState('')

  function handleAddSubject(e) {
    e.preventDefault()

    if (!subjectName.trim()) return

    setSubjects([
      ...subjects,
      {
        id: Date.now(),
        name: subjectName.trim(),
        examDate,
      },
    ])

    setSubjectName('')
    setExamDate('')
  }

  function handleDelete(id) {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      setSubjects(subjects.filter((subject) => subject.id !== id))
    }
  }

  function handleRename(id) {
    const newName = window.prompt('Enter new subject name')

    if (newName?.trim()) {
      setSubjects(
        subjects.map((subject) =>
          subject.id === id
            ? { ...subject, name: newName.trim() }
            : subject,
        ),
      )
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Subjects</h1>
        <p className="mt-2 text-slate-600">
          Organize your subjects and exam dates.
        </p>
      </div>

      <form
        onSubmit={handleAddSubject}
        className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2"
      >
        <input
          type="text"
          placeholder="Enter subject name"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          className="rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
          required
        />

        <input
          type="date"
          value={examDate}
          min={new Date().toLocaleDateString('en-CA')}
          onChange={(e) => setExamDate(e.target.value)}
          className="rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 sm:col-span-2"
        >
          + Add Subject
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{subject.name}</h2>

            <p className="mt-2 text-sm text-slate-500">
              Exam Date: {subject.examDate || 'Not set'}
            </p>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleRename(subject.id)}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Rename
              </button>

              <button
                onClick={() => handleDelete(subject.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <p className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-500">
          No subjects added yet. Add your first subject!
        </p>
      )}
    </section>
  )
}
