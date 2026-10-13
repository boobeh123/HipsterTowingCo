/**************************************************************
 * viewLocals.js
 * Sets the locals every view and partial reads: the four flash
 * types, currentPath and user. Registered in server.js after
 * session, passport and the flash middleware, and before the
 * routes.
 *
 * Reading a flash type never writes to the session
 * (middleware/flash.js), so an anonymous visitor with nothing
 * waiting still gets no cookie and no session document in
 * MongoDB. connect-flash, which this app used before, created
 * session.flash on every read, and this file had to skip reading
 * unless a flash was waiting. viewLocals.test.js checks the
 * no-cookie behavior with the real session and flash middleware.
 *
 * currentPath uses req.path, not req.originalUrl, so
 * /dashboard?page=2 still matches '/dashboard' in header.ejs.
 **************************************************************/
module.exports = (req, res, next) => {
    res.locals.success = req.flash('success')
    res.locals.errors  = req.flash('errors')
    res.locals.error   = req.flash('error')
    res.locals.info    = req.flash('info')
    res.locals.currentPath = req.path
    res.locals.user = req.user || null
    next()
}
