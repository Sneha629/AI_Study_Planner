const jwt = require('jsonwebtoken')

// F1: reject requests without a valid token; sets req.userId for the route
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Please log in to continue' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Your session has expired, please log in again' })
  }
}

module.exports = requireAuth
