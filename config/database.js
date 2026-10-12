const mongoose = require('mongoose')

// Neutralize query operators ($ne, $gt, ...) smuggled in through request
// data. Operators the app writes itself must be wrapped in
// mongoose.trusted(), as in controllers/reset.js, or Mongoose treats them
// the same way.
mongoose.set('sanitizeFilter', true)

const connectDB = async () => {

  try {
    const conn = await mongoose.connect(process.env.DB_STRING)

    console.log(`MongoDB Connected: ${conn.connection.host}`)

  } catch (err) {

    console.error(err, err.message)
    process.exit(1)

  }

}

module.exports = connectDB
