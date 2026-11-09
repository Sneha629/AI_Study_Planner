
import { Link, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import NotFound from './pages/NotFound.jsx'
import SubjectDecks from './pages/SubjectDecks.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'



export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold">
            AI Study Planner
          </Link>

          <div className="flex gap-4 text-sm">
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/subjects/:id" element={<ProtectedRoute><SubjectDecks /></ProtectedRoute>} />

          <Route path="/subjects/:id" element={<SubjectDecks />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )

}




