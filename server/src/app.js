const express = require('express')
const cors = require('cors')
const healthRoutes = require('./routes/health.routes')
const authRoutes = require('./routes/auth.routes')
const subjectRoutes = require('./routes/subject.routes')
const decksRoutes = require('./routes/decks.routes')
const cardsRoutes = require('./routes/cards.routes')
const notesRoutes = require('./routes/notes.routes')
const studyRoutes = require('./routes/study.routes')
const statsRoutes = require('./routes/stats.routes')
const sharedRoutes = require('./routes/shared.routes')
const requireAuth = require('./middleware/auth')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// CLIENT_URL can list several sites, comma separated (e.g. the Vercel site and localhost).
// Trailing slashes are dropped because browsers send the origin without one.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean)

app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '1mb' }))

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/shared', sharedRoutes)
app.use('/api/subjects', requireAuth, subjectRoutes)
app.use('/api', requireAuth, decksRoutes)
app.use('/api', requireAuth, cardsRoutes)
app.use('/api', requireAuth, notesRoutes)
app.use('/api', requireAuth, studyRoutes)
app.use('/api', requireAuth, statsRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})
app.use(errorHandler)

module.exports = app
