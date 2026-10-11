/**************************************************************
 * viewLocals.js
 * Sets the locals every view and partial reads: the four flash
 * types, currentPath and user. Registered in server.js after
 * session, passport and connect-flash, and before the routes.
 *
 * Calling req.flash() creates session.flash even when nothing is
 * waiting, and express-session saves any session that changed and
 * gives it a cookie. So flashes are read only when one exists.
 * Otherwise every anonymous visitor, bots included, would get a
 * cookie and a session document in MongoDB.
 *
 * currentPath uses req.path, not req.originalUrl, so
 * /dashboard?page=2 still matches '/dashboard' in header.ejs.
 **************************************************************/
module.exports = (req, res, next) => {
    const hasFlash = Boolean(req.session && req.session.flash)

    res.locals.success = hasFlash ? req.flash('success') : []
    res.locals.errors  = hasFlash ? req.flash('errors')  : []
    res.locals.error   = hasFlash ? req.flash('error')   : []
    res.locals.info    = hasFlash ? req.flash('info')    : []
    res.locals.currentPath = req.path
    res.locals.user = req.user || null
    next()
}
