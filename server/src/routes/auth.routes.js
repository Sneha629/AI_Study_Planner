const { Router } = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const requireAuth = require('../middleware/auth')
const validate = require('../middleware/validate')
const {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../validators/auth.validators')

const router = Router()

// Slow down password guessing: 20 attempts per 15 minutes per IP (off in tests)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts, please try again in 15 minutes' },
})

function signToken(userId) {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// F1: create account, return token
router.post('/signup', authLimiter, validate(signupSchema), async (req, res) => {
  const { name, email, password, timezone } = req.body

  if (await User.exists({ email })) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash, timezone })

  res.status(201).json({ token: signToken(user._id), user })
})

// F1: log in, return token
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email })
  // Same message for wrong email and wrong password, so emails can't be guessed
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  res.json({ token: signToken(user._id), user })
})

// F1: current user and settings
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(401).json({ error: 'Your session has expired, please log in again' })
  }
  res.json({ user })
})

router.patch('/me', requireAuth, validate(updateProfileSchema), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, { $set: req.body }, { new: true, runValidators: true })
  if (!user) {
    return res.status(401).json({ error: 'Your session has expired, please log in again' })
  }
  res.json({ user })
})

// F1: change password. The current password is checked first, so a stolen
// logged-in session alone cannot lock the owner out. Rate limited like login.
router.patch('/password', authLimiter, requireAuth, validate(changePasswordSchema), async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(401).json({ error: 'Your session has expired, please log in again' })
  }
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
    // 400, not 401: the session is fine, only the typed password is wrong
    return res.status(400).json({
      error: 'Current password is incorrect',
      details: [{ field: 'currentPassword', message: 'Current password is incorrect' }],
    })
  }

  user.passwordHash = await bcrypt.hash(req.body.newPassword, 10)
  await user.save()
  res.json({ message: 'Password updated' })
})

module.exports = router
