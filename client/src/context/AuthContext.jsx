import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Page refresh pe token se user wapas laao
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  function saveSession(data) {
    localStorage.setItem('token', data.token)
    setUser(data.user)
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    saveSession(res.data)
  }

  async function signup(name, email, password) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const res = await api.post('/auth/signup', { name, email, password, timezone })
    saveSession(res.data)
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  function updateUser(changes) {
    setUser((prev) => (prev ? { ...prev, ...changes } : prev))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}