const express = require('express')
const app = express()
const mongoose = require('mongoose')
const passport = require('passport')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('express-flash')
const logger = require('morgan')
const connectDB = require('./config/database')
const methodOverride = require("method-override");
const mainRoutes = require('./routes/main')
const todoRoutes = require('./routes/todos')
const profileRoutes = require('./routes/profile')
const contactRoutes = require('./routes/contact');

require('dotenv').config({path: './config/.env'})

// Passport config
require('./config/passport')(passport)

connectDB()
// Allow moment to be used in templating engine
app.locals.moment = require('moment')
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
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: false,
      store: new MongoStore({ mongooseConnection: mongoose.connection }),
    })
  )
  
// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())

app.use('/', mainRoutes)
app.use('/todos', todoRoutes)
app.use('/profile', profileRoutes)
app.use('/contact', contactRoutes);

// Error handling routes
app.use((req, res) => {
  res.status(404).render('errors/404');
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500');
});

app.listen(process.env.PORT, ()=>{
    console.log('Server is running, you better catch it!')
})    