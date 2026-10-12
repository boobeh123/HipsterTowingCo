/**************************************************************
 * ensureAuth
 * Protects server-rendered routes. Two-stage check:
 * 1. Not authenticated         → redirect to /login
 * 2. Authenticated, no name   → redirect to /onboard (onboarding incomplete)
 * 3. Authenticated, name set  → next()
 **************************************************************/
const ensureAuth = (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/login')
    if (!req.user.name) return res.redirect('/onboard')
    return next()
}

/**************************************************************
 * ensureAuthApi
 * Protects JSON/API endpoints. Returns errors as JSON
 * instead of redirecting, so fetch() callers can handle them.
 * 1. Not authenticated         → 401
 * 2. Authenticated, no name   → 403 (onboarding incomplete)
 * 3. Authenticated, name set  → next()
 **************************************************************/
const ensureAuthApi = (req, res, next) => {
    // Marks the request as a JSON endpoint so errorHandler returns JSON rather than an HTML error page 
    req.wantsJson = true

    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized.' })
    if (!req.user.name) return res.status(403).json({ error: 'Onboarding required.' })
    return next()
}

/**************************************************************
 * ensureOnboarding
 * Guards GET /onboard and POST /onboard.
 * 1. Not authenticated              → redirect to /login
 * 2. Authenticated, name already set → redirect to /dashboard (already onboarded)
 * 3. Authenticated, name not set    → next() (onboarding is active)
 **************************************************************/
const ensureOnboarding = (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/login')
    if (req.user.name) return res.redirect('/dashboard')
    return next()
}

/**************************************************************
 * markLoginTime / endStaleSessions
 * A password reset sets passwordChangedAt on the account, and
 * every login records loginAt on its session (markLoginTime).
 * endStaleSessions runs on every request, right after passport.
 * A session that logged in before the last password change is
 * signed out, so whoever knew the old password loses access on
 * every other device. The request carries on as a visitor's.
 * Anything new that logs a user in must call markLoginTime.
 **************************************************************/
const markLoginTime = (req) => {
    req.session.loginAt = Date.now()
}

const endStaleSessions = (req, res, next) => {
    const changedAt = req.user && req.user.passwordChangedAt
    if (!changedAt || (req.session.loginAt || 0) >= changedAt.getTime()) {
        return next()
    }
    req.logout((err) => next(err))
}

module.exports = { ensureAuth, ensureAuthApi, ensureOnboarding, markLoginTime, endStaleSessions }
