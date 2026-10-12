const mongoose = require('mongoose')

// Neutralize query operators ($ne, $gt, ...) smuggled in through request
// data. Operators the app writes itself must be wrapped in
// mongoose.trusted(), as in controllers/reset.js, or Mongoose treats them
// the same way.
mongoose.set('sanitizeFilter', true)

// Connects once and returns the driver's client, which the session store in
// server.js reuses instead of opening a second connection. A failure is
// thrown to server.js, which logs it and exits rather than serve requests
// with no database.
const connectDB = async () => {
  const conn = await mongoose.connect(process.env.DB_STRING)
  console.log(`MongoDB Connected: ${conn.connection.host}`)
  return conn.connection.getClient()
}

module.exports = connectDB
