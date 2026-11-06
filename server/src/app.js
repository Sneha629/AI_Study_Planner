const express = require('express')
const cors = require('cors')
const healthRoutes = require('./routes/health.routes')
const authRoutes = require('./routes/auth.routes')
const subjectRoutes = require('./routes/subject.routes')
const requireAuth = require('./middleware/auth')
const errorHandler = require('./middleware/errorHandler')

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/subjects', requireAuth, subjectRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})
app.use(errorHandler)

module.exports = app
