const { z } = require('zod')

const front = z
  .string({ error: 'Front is required' })
  .trim()
  .min(1, 'Front is required')
  .max(500, 'Front must be at most 500 characters')

const back = z
  .string({ error: 'Back is required' })
  .trim()
  .min(1, 'Back is required')
  .max(2000, 'Back must be at most 2000 characters')

// .strict() rejects unknown fields, so the client cannot set SM-2 state or source
const createCardSchema = z.object({ front, back }).strict()

const updateCardSchema = z
  .object({ front: front.optional(), back: back.optional() })
  .strict()
  .refine((body) => body.front !== undefined || body.back !== undefined, {
    message: 'Send front or back to update',
  })

module.exports = { createCardSchema, updateCardSchema }
