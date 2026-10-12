const rateLimit = require('express-rate-limit')

/**************************************************************
 * flashAndRedirect
 * Builds a rate-limit handler for form-backed routes.
 * express-rate-limit's default response is a plain-text 429 body,
 * which would drop the user on a blank page. Instead we reuse the
 * flash-then-redirect pattern the controllers already use.
 *
 * Redirecting to req.originalUrl is safe here: these handlers only
 * run once a route has already matched, so the value is always the
 * same app path the user just posted to. A route with no page of
 * its own (POST /profile/photo) passes redirectTo instead.
 **************************************************************/
const flashAndRedirect = (message, redirectTo) => (req, res, next) => {
    req.flash('errors', [{ msg: message }])
    req.session.save((err) => {
        if (err) { return next(err) }
        res.redirect(redirectTo || req.originalUrl)
    })
}

// Counts per account instead of per IP. These limiters only run after
// ensureAuth or ensureAuthApi, so req.user is always set.
const byAccount = (req) => String(req.user._id)

/**************************************************************
 * authLimiter
 * Guards POST /login and POST /signup against credential brute force.
 * 20 requests per IP per 15 minutes, per the project standard.
 **************************************************************/
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: flashAndRedirect('Too many attempts. Please wait 15 minutes and try again.'),
})

/**************************************************************
 * passwordResetLimiter
 * Guards POST /forgot and POST /reset/:token.
 * Tighter than authLimiter because every POST /forgot sends a real
 * email — without a cap this route is an email-bombing vector and
 * will exhaust the account's daily sending quota.
 * 5 requests per IP per hour.
 **************************************************************/
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: flashAndRedirect('Too many password reset requests. Please wait an hour and try again.'),
})

/**************************************************************
 * counterLimiter
 * Guards POST /inspections/count, which is unauthenticated and
 * drives the public homepage counter. Responds with JSON because
 * the caller is a fetch() in public/js/main.js, not a form.
 * 30 requests per IP per 15 minutes.
 **************************************************************/
const counterLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests. Please try again later.' })
    },
})

/**************************************************************
 * inspectionSaveLimiter
 * Guards POST /inspections. Each save stores a document, so
 * without a cap one account could fill the database. Responds
 * with JSON because the caller is a fetch() in public/js/main.js.
 * 60 saves per account per 15 minutes.
 **************************************************************/
const inspectionSaveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: byAccount,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many inspections saved. Please wait a few minutes and try again.' })
    },
})

/**************************************************************
 * photoUploadLimiter
 * Guards POST /profile/photo. Every upload goes to Cloudinary and
 * counts against the account's quota. Runs before multer, so a
 * blocked request never writes a temp file.
 * 10 uploads per account per hour.
 **************************************************************/
const photoUploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: byAccount,
    handler: flashAndRedirect('Too many photo uploads. Please wait an hour and try again.', '/profile'),
})

/**************************************************************
 * passwordChangeLimiter
 * Guards POST /profile/password. Someone holding a stolen session
 * could otherwise guess the current password without limit, so
 * this counts per account, not per IP. The route has no page of
 * its own, so the user goes back to the profile page.
 * 10 attempts per account per 15 minutes.
 **************************************************************/
const passwordChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: byAccount,
    handler: flashAndRedirect('Too many password change attempts. Please wait 15 minutes and try again.', '/profile'),
})

/**************************************************************
 * exportLimiter
 * Guards GET /dashboard/export. Each export reads every matching
 * inspection, so this caps how often one account can run it.
 * 20 exports per account per 15 minutes, then back to the
 * dashboard with a message.
 **************************************************************/
const exportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: byAccount,
    handler: flashAndRedirect('Too many exports. Please wait a few minutes and try again.', '/dashboard'),
})

module.exports = { authLimiter, passwordResetLimiter, counterLimiter, inspectionSaveLimiter, photoUploadLimiter, passwordChangeLimiter, exportLimiter }
