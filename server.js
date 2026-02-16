const express = require('express')
const app = express()
const dotenv = require('dotenv');
const logger = require('morgan')
const connectDB = require('./config/database')
const methodOverride = require("method-override");
const session = require('express-session')
const MongoStore = require('connect-mongo').default
const mongoose = require('mongoose')
const passport = require('passport')
const flash = require('express-flash')
const mainRoutes = require('./routes/main')
// const todoRoutes = require('./routes/todos')
// const profileRoutes = require('./routes/profile')
// const contactRoutes = require('./routes/contact');

require('dotenv').config({path: './config/.env'})

// Passport config
require('./config/passport')(passport)

connectDB()
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(logger('dev'))
//Use forms for put / delete
app.use(methodOverride("_method"));
// Sessions
app.use(
  session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
          mongoUrl: process.env.DB_STRING,
        })
    })
)

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())

// Allow moment to be used in templating engine
app.locals.moment = require('moment')
// Available to all Views
// app.use((req, res, next) => {

// })


app.use('/', mainRoutes)
// app.use('/todos', todoRoutes)
// app.use('/profile', profileRoutes)
// app.use('/contact', contactRoutes);

app.listen(process.env.PORT, ()=>{
    console.log('Server is running, you better catch it!')
})    