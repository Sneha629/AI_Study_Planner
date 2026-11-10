const { z } = require('zod')

// Accepts only real IANA time zones like "Asia/Kolkata"
const timezone = z.string().refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz })
      return true
    } catch {
      return false
    }
  },
  { message: 'Invalid time zone' },
)

const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
  timezone: timezone.optional(),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be at most 50 characters').optional(),
    timezone: timezone.optional(),
    dailyReviewLimit: z.number().int().min(1).max(500).optional(),
    dailyNewLimit: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  .refine((profile) => Object.keys(profile).length > 0, {
    message: 'At least one field is required',
  })

module.exports = { signupSchema, loginSchema, updateProfileSchema }
