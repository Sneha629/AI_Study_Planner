const dns = require('dns')
const mongoose = require('mongoose')

// Public DNS used when the computer's own DNS cannot answer Atlas's SRV lookup
const PUBLIC_DNS = ['1.1.1.1', '8.8.8.8']

// On some Windows setups (after a Wi-Fi change, a VPN, ...) Node asks 127.0.0.1 for DNS,
// nothing answers, and "mongodb+srv://" links fail with "querySrv ECONNREFUSED".
function isSrvDnsFailure(err) {
  return /querySrv/.test(err.message)
}

async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Copy server/.env.example to server/.env and fill it in.')
  }
  try {
    await mongoose.connect(uri)
  } catch (err) {
    if (!uri.startsWith('mongodb+srv://') || !isSrvDnsFailure(err)) throw err
    console.warn(`DNS lookup for MongoDB failed (${err.message}). Retrying with public DNS ${PUBLIC_DNS.join(', ')}`)
    dns.setServers(PUBLIC_DNS)
    await mongoose.connect(uri)
  }
  console.log('MongoDB connected')
}

module.exports = connectDB
