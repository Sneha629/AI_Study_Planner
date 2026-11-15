import { Route, Routes, useLocation } from 'react-router-dom'

import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Subjects from './pages/Subjects.jsx'
import SubjectDecks from './pages/SubjectDecks.jsx'
import Study from './pages/Study.jsx'
import Notes from './pages/Notes.jsx'
import NotFound from './pages/NotFound.jsx'
import DeckCards from './pages/DeckCards.jsx'
import SharedDeck from './pages/SharedDeck.jsx'
import Progress from './pages/Progress.jsx'
import Settings from './pages/Settings.jsx'
import Quiz from './pages/Quiz.jsx'
import QuizPicker from './pages/QuizPicker.jsx'
import ExamPlanner from './pages/ExamPlanner.jsx'
import SharedDecks from './pages/SharedDecks.jsx'

import AppShell from './components/AppShell.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './context/AuthContext.jsx'

// Pages with their own full-screen layout (no sidebar)
const FULL_SCREEN = ['/login', '/signup']

// Logged-in pages: each is wrapped in ProtectedRoute
const PROTECTED = [
  ['/', Home],
  ['/subjects', Subjects],
  ['/subjects/:id', SubjectDecks],
  ['/subjects/:id/notes', Notes],
  ['/subjects/:id/decks/:deckId', DeckCards],
  ['/decks/:deckId/quiz', Quiz],
  ['/study', Study],
  ['/quiz', QuizPicker],
  ['/planner', ExamPlanner],
  ['/progress', Progress],
  ['/shared-decks', SharedDecks],
  ['/settings', Settings],
]

function AppRoutes() {
  return (
    <Routes>
      {PROTECTED.map(([path, Page]) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute>
              <Page />
            </ProtectedRoute>
          }
        />
      ))}
      {/* Public pages */}
      <Route path="/shared/:token" element={<SharedDeck />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  if (FULL_SCREEN.includes(pathname)) return <AppRoutes />

  // Logged-in users get the sidebar layout; visitors (e.g. a public shared deck) get a plain page
  if (user && !pathname.startsWith('/shared/')) {
    return (
      <AppShell>
        <AppRoutes />
      </AppShell>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AppRoutes />
      </main>
    </div>
  )
}
