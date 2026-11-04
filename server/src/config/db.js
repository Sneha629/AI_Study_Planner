const mongoose = require('mongoose')

async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Copy server/.env.example to server/.env and fill it in.')
  }
  await mongoose.connect(uri)
  console.log('MongoDB connected')
}

module.exports = connectDB
