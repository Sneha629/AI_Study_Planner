const os = require('os')
const mongoose = require('mongoose')

// Tests use their own database so they never touch your dev data
const TEST_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/ai-study-planner-test'

async function connectTestDB() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
  // The MongoDB driver loads `os` with a dynamic import(), which fails inside Jest's
  // CommonJS sandbox and breaks the handshake. Passing it in directly avoids that.
  await mongoose.connect(TEST_URI, { runtimeAdapters: { os } })
}

async function clearTestDB() {
  const collections = await mongoose.connection.db.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
}

async function closeTestDB() {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
}

module.exports = { connectTestDB, clearTestDB, closeTestDB }
