
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { generateQuiz, submitQuiz } from '../api/quiz.js'

export default function Quiz() {
  const { deckId } = useParams()
  const navigate = useNavigate()

  const [count, setCount] = useState(5)
  const [quiz, setQuiz] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    setResult(null)

    try {
      const data = await generateQuiz(deckId, count)

      setQuiz(data)
      setAnswers(Array(data.total).fill(null))
      setCurrentIndex(0)
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Could not generate quiz. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (optionIndex) => {
    setAnswers((previous) =>
      previous.map((answer, index) =>
        index === currentIndex ? optionIndex : answer,
      ),
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const data = await submitQuiz(quiz._id, answers)
      setResult(data)
    } catch (error) {
      toast.error(
        error.response?.data?.error || 'Could not submit quiz. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleTryAgain = () => {
    setQuiz(null)
    setResult(null)
    setAnswers([])
    setCurrentIndex(0)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="mb-4 text-5xl">🧠</div>
        <h2 className="text-2xl font-bold text-slate-800">
          Making your quiz...
        </h2>
        <p className="mt-3 text-slate-500">
          AI is preparing your questions. This may take 10–30 seconds.
        </p>
      </div>
    )
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 text-3xl font-bold text-slate-800">
            Quiz Completed!
          </h1>
          <p className="mt-5 text-5xl font-extrabold text-indigo-600">
            {result.score} / {result.total}
          </p>
          <p className="mt-2 text-slate-500">Your final score</p>

          <button
            type="button"
            onClick={handleTryAgain}
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">
            Answer Review
          </h2>

          {result.results.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-800">
                  {index + 1}. {item.question}
                </h3>
                <span
                  className={`shrink-0 font-bold ${
                    item.correct ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {item.correct ? '✓ Correct' : '✗ Wrong'}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {item.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className={`rounded-lg border p-3 text-sm ${
                      optionIndex === item.correctIndex
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : optionIndex === item.chosen
                          ? 'border-red-500 bg-red-50 text-red-800'
                          : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {option}
                    {optionIndex === item.correctIndex && (
                      <span className="ml-2 font-semibold">
                        (Correct Answer)
                      </span>
                    )}
                    {optionIndex === item.chosen &&
                      !item.correct &&
                      <span className="ml-2 font-semibold">
                        (Your Answer)
                      </span>
                    }
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Go Back
        </button>

        <div className="text-center">
          <div className="text-5xl">🧠</div>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">
            AI Quiz
          </h1>
          <p className="mt-2 text-slate-500">
            Test your knowledge with an AI-generated quiz.
          </p>
        </div>

        <div className="mt-8">
          <label className="mb-3 block font-semibold text-slate-700">
            Select number of questions
          </label>

          <div className="grid grid-cols-2 gap-4">
            {[5, 10].map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setCount(number)}
                className={`rounded-xl border-2 p-5 font-semibold transition ${
                  count === number
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {number} Questions
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  const question = quiz.questions[currentIndex]
  const isLastQuestion = currentIndex === quiz.total - 1

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Exit Quiz
        </button>

        <span className="text-sm font-semibold text-slate-500">
          {currentIndex + 1} / {quiz.total}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{
            width: `${((currentIndex + 1) / quiz.total) * 100}%`,
          }}
        />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-indigo-600">
          QUESTION {currentIndex + 1}
        </p>

        <h1 className="mt-4 text-xl font-bold leading-relaxed text-slate-800 sm:text-2xl">
          {question.question}
        </h1>

        <div className="mt-7 space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              className={`w-full rounded-xl border-2 p-4 text-left transition ${
                answers[currentIndex] === index
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 text-slate-700 hover:border-indigo-300'
              }`}
            >
              <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-bold">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((index) => index - 1)}
            disabled={currentIndex === 0}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          {isLastQuestion ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={answers.some((answer) => answer === null) || submitting}
              className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((index) => index + 1)}
              disabled={answers[currentIndex] === null}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
