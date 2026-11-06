const { Schema, model } = require('mongoose')

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // IANA zone like "Asia/Kolkata"; needed for streaks and "today"
    timezone: { type: String, default: 'Asia/Kolkata' },
    dailyReviewLimit: { type: Number, default: 100, min: 1 },
    dailyNewLimit: { type: Number, default: 20, min: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Never send the password hash to the client
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash
    return ret
  },
})

module.exports = model('User', userSchema)
