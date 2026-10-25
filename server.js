require('dotenv').config({ path: './config/.env', quiet: true }) // quiet: no dotenv tip line in the logs

const express = require('express')
const app = express()
const helmet = require('helmet')
const logger = require('morgan')
const connectDB = require('./config/database')
const methodOverride = require('method-override')
const session = require('express-session')
const { MongoStore } = require('connect-mongo')
const passport = require('passport')
const mainRoutes = require('./routes/main')
const flash = require('./middleware/flash')
const viewLocals = require('./middleware/viewLocals')
const { endStaleSessions } = require('./middleware/auth')
const errorHandler = require('./middleware/errorHandler')
const { redactUrl } = require('./utils/logUrl')

// Passport config
require('./config/passport')(passport)

const PORT = process.env.PORT || 3000
const isProduction = process.env.NODE_ENV === 'production'

// Password reset emails build their link from BASE_URL (controllers/reset.js)
if (isProduction && !process.env.BASE_URL) {
  console.error('BASE_URL is not set: password reset emails will fail until it is.')
}

// Connect once. The session store reuses this connection, and the server
// starts listening only after it succeeds (see the bottom of this file).
const clientPromise = connectDB()

// Railway routes requests through a proxy. Without this, req.ip is the proxy's
// address — so the rate limiters would count every visitor as one client — and
// Express can't tell the connection is HTTPS, so secure cookies are never set.
// The value is 1 (one proxy hop), not true: express-rate-limit rejects `true`
// as too permissive because it lets clients spoof X-Forwarded-For.
app.set('trust proxy', 1)
app.set('view engine', 'ejs')

// The DVIR checklist's items and notes, for the inspection form on every page
// that includes it (views/partials/checklistSection.ejs)
app.locals.dvirChecklist = require('./utils/dvirChecklist')

// When the privacy policy last changed, for its page and for the notice that
// tells signed-in users about it (views/partials/privacyNotice.ejs)
app.locals.privacyPolicy = require('./utils/privacyPolicy')

// X-Content-Type-Options: nosniff — prevents MIME sniffing attacks
// X-Frame-Options: SAMEORIGIN — prevents clickjacking via iframes
// Strict-Transport-Security — forces HTTPS on browsers that have visited before
// X-DNS-Prefetch-Control — controls DNS prefetching
// Referrer-Policy — controls what's sent in the Referer header
// CSP is configured explicitly to allow Google Analytics, Google Fonts, jsPDF from cdnjs, Cloudinary images, and our own assets while blocking everything else.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            // No 'unsafe-inline'. The hash is the JSON-LD block in head.ejs, and
            // cdnjs serves jsPDF (pinned with an integrity hash in footer.ejs).
            scriptSrc:      ["'self'", "'sha256-NDhfFC8SsrynpH/33WORDEVUNZTNzuIZ98Qxx9z7BJY='", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://cdnjs.cloudflare.com"],
            // scriptSrcAttr is absent — it defaults to 'none', 
            // which blocks inline handlers like onclick/onsubmit. 
            // The two this app had were replaced with addEventListener.
            // No 'unsafe-inline' for styles either: no page uses a style
            // attribute or <style> block. Setting element.style from JS is
            // still allowed.
            styleSrc:       ["'self'", "https://fonts.googleapis.com"],
            fontSrc:        ["'self'", "https://fonts.gstatic.com"],
            imgSrc:         ["'self'", "data:", "https://res.cloudinary.com", "https://www.google-analytics.com"],
            connectSrc:     ["'self'", "https://www.google-analytics.com", "https://analytics.google.com"],
            frameSrc:       ["'none'"],
            objectSrc:      ["'none'"],
            upgradeInsecureRequests: isProduction ? [] : null,
        },
    },
    // X-Frame-Options: SAMEORIGIN — already covered by CSP frameSrc 'none'
    // but kept for older browsers that don't support CSP
    xFrameOptions: { action: 'sameorigin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))

// Logging: Apache's combined format in production, short colored lines locally.
// redactUrl keeps reset tokens and dashboard search text out of Railway's logs.
logger.token('url', (req) => redactUrl(req.originalUrl || req.url))
app.use(logger(isProduction ? 'combined' : 'dev'))

// Body parsing. No form uses nested field names, so the simple parser is
// enough, and a field like email[$ne] stays a plain string key instead of
// becoming an object. The inspection save arrives as JSON.
// inflate: false refuses a compressed request body with a 415. Otherwise
// body-parser decompresses gzip and Brotli bodies through Node's zlib, where
// the Oct 21 2026 Node security release fixed a Brotli bug that let crafted
// data run code. No browser compresses a form post or a fetch() body.
app.use(express.urlencoded({ extended: false, inflate: false }))
// An inspection save can carry two drawn signatures of up to 60 KB each
// (SIGNATURE_MAX_LENGTH in public/js/utils.js); the default limit is 100kb
app.use(express.json({ limit: '200kb', inflate: false }))

app.use(express.static('public'))
// Use forms for put / delete
app.use(methodOverride('_method'))

// Sessions, stored in MongoDB over the same connection as Mongoose
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ clientPromise }),
    cookie: {
      httpOnly: true,                    // Not readable by document.cookie
      sameSite: 'lax',                   // Blocks most cross-site request forgery
      secure: isProduction,              // HTTPS only in production; local dev is plain HTTP
      maxAge: 1000 * 60 * 60 * 24 * 7,   // 7 days
    },
  })
)

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// req.flash(): messages for the next page, kept in the session
app.use(flash)

// Signs out sessions that logged in before the account's last password
// change, with a flash saying why (so it runs after flash)
app.use(endStaleSessions)

// Flash + request context for all views (must run after session + flash)
app.use(viewLocals)

app.use('/', mainRoutes)

// 404 handler — catches any request that didn't match a route above
app.use((req, res) => {
  res.status(404).render('errors/404.ejs')
})

// Central error handler — must be last -> routes -> 404 handler - > error handler
app.use(errorHandler)

// Requests arriving before the database is up would only fail, and a server
// that can't reach its database at all should stop so Railway restarts it
clientPromise
  .then(() => {
    app.listen(PORT, () => {
      // The Node version shows in Railway's deploy log, to confirm the pin in
      // package.json's engines took effect
      console.log(`Server is running on port ${PORT} with Node ${process.version}, you better catch it!`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err)
    process.exit(1)
  })
