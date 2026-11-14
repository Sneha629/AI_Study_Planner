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

import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Full-screen pages that bring their own layout (no navbar, no page padding)
const FULL_SCREEN = ['/login', '/signup']

export default function App() {
  const { pathname } = useLocation()
  const fullScreen = FULL_SCREEN.includes(pathname)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!fullScreen && <Navbar />}

      <main className={fullScreen ? '' : 'mx-auto max-w-6xl px-4 py-8 sm:px-6'}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/subjects"
            element={
              <ProtectedRoute>
                <Subjects />
              </ProtectedRoute>
            }
          />

          <Route
            path="/subjects/:id/notes"
            element={
              <ProtectedRoute>
                <Notes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/study"
            element={
              <ProtectedRoute>
                <Study />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route path="/shared/:token" element={<SharedDeck />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/subjects/:id"
            element={
              <ProtectedRoute>
                <SubjectDecks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:id/decks/:deckId"
            element={
              <ProtectedRoute>
                <DeckCards />
              </ProtectedRoute>
            }
          />
          <Route
  path="/decks/:deckId/quiz"
  element={
    <ProtectedRoute>
      <Quiz />
    </ProtectedRoute>
  }
/>

          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <Progress />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}