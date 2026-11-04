import axios from 'axios'

// VITE_API_URL is set on Vercel; locally the Vite proxy forwards /api to Express
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Log the user out if the token is missing or expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
    }
    return Promise.reject(error)
  },
)

export default api
