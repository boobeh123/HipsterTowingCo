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
 * same app path the user just posted to.
 **************************************************************/
const flashAndRedirect = (message) => (req, res, next) => {
    req.flash('errors', [{ msg: message }])
    req.session.save((err) => {
        if (err) { return next(err) }
        res.redirect(req.originalUrl)
    })
}

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

module.exports = { authLimiter, passwordResetLimiter, counterLimiter }
