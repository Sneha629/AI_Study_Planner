import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import NotFound from './pages/NotFound.jsx'
import SubjectDecks from './pages/SubjectDecks.jsx'
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
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold">
            AI Study Planner
          </Link>

          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="max-w-[8rem] truncate font-medium">{user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex gap-4 text-sm">
              <Link to="/login">Log in</Link>
              <Link to="/signup">Sign up</Link>
            </div>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/subjects/:id" element={<ProtectedRoute><SubjectDecks /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}