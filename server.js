const express = require('express')
const app = express()
const mongoose = require('mongoose')
const passport = require('passport')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('express-flash')
const logger = require('morgan')
const compression = require('compression')
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

// Enable Gzip compression for all responses
app.use(compression({
    level: 6, // Good balance between compression and speed
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Use compression for all other requests
        return compression.filter(req, res);
    }
}));

// Security and performance middleware
app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Cache control for static assets
    if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    next();
});

app.use(express.static('public', {
    maxAge: '1y',
    etag: true
}))
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