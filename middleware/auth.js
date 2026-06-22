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

module.exports = { ensureAuth, ensureAuthApi, ensureOnboarding }
