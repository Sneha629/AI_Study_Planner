
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Subjects from './pages/Subjects.jsx'
import SubjectDecks from './pages/SubjectDecks.jsx'
import NotFound from './pages/NotFound.jsx'

import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            AI Study Planner
          </Link>

          {user ? (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link to="/subjects" className="hover:text-blue-600">
                Subjects
              </Link>

              <span className="max-w-[8rem] truncate font-medium text-slate-700">
                {user.name}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-500 px-3 py-2 text-white hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-4 text-sm">
              <Link to="/login" className="hover:text-blue-600">
                Log in
              </Link>
              <Link to="/signup" className="hover:text-blue-600">
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
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

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
