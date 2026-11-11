require('dotenv/config')
const app = require('./app')
const connectDB = require('./config/db')

const PORT = process.env.PORT || 5000

connectDB()
  .then(() => {
    // Express 5 calls this with an error too (e.g. the port is busy), so check it
    app.listen(PORT, (err) => {
      if (err) {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use. Another server is probably still running:`)
          console.error('close that terminal (Ctrl + C), or set a different PORT in server/.env')
        } else {
          console.error('Could not start the server:', err.message)
        }
        process.exit(1)
      }
      console.log(`API running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message)
    process.exit(1)
  })
