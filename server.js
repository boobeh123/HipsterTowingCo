require('dotenv').config({ path: './config/.env' })

const express = require('express')
const app = express()
const logger = require('morgan')
const connectDB = require('./config/database')
const methodOverride = require('method-override')
const session = require('express-session')
const MongoStore = require('connect-mongo').default
const passport = require('passport')
const flash = require('connect-flash')
const mainRoutes = require('./routes/main')
// const todoRoutes = require('./routes/todos')
// const profileRoutes = require('./routes/profile')
// const contactRoutes = require('./routes/contact');

// Passport config
require('./config/passport')(passport)

connectDB()
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(logger('dev'))
// Use forms for put / delete
app.use(methodOverride('_method'))

// Sessions (mongoOptions avoids indefinite hangs if DB is unreachable)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB_STRING,
      mongoOptions: {
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
      },
    }),
  })
)

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())

// Flash + request context for all views (must run after session + connect-flash)
app.use((req, res, next) => {
  try {
    res.locals.success = req.flash('success')
    res.locals.errors = req.flash('errors')
    res.locals.error = req.flash('error')
    res.locals.info = req.flash('info')
    // res.locals.currentPath = req.originalUrl
    // res.locals.user = req.user || null
    next()
  } catch (err) {
    next(err)
  }
})

// Allow moment to be used in templating engine
app.locals.moment = require('moment')

app.use('/', mainRoutes)
// app.use('/todos', todoRoutes)
// app.use('/profile', profileRoutes)
// app.use('/contact', contactRoutes);

app.listen(process.env.PORT, () => {
  console.log('Server is running, you better catch it!')
})
