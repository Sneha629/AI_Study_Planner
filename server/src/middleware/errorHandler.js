// Global error handler: every failure returns a clear JSON message.
// Express needs all four arguments to treat this as an error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500
  if (status >= 500 && !err.expose) console.error(err)
  // 5xx messages stay hidden unless the error was written for users (err.expose)
  res.status(status).json({
    error: status >= 500 && !err.expose ? 'Something went wrong, please try again' : err.message,
  })
}

module.exports = errorHandler
