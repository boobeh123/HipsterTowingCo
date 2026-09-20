/**************************************************************
 * errorHandler.js
 * Central error handling middleware for Express.
 * Registered last in server.js so it catches any error passed in to next(err) from routes or middleware.
 * The four-parameter signature (err, req, res, next) is required
 * for Express to recognise this as an error handler.
 *
 * Three things it has to get right:
 * 1. JSON endpoints must receive JSON. An HTML error page sent to a
 *    fetch() caller doing response.json() fails to parse, so the real
 *    error is replaced by a confusing parse error in the console.
 * 2. The status code should reflect the error. Reporting a 404 as a 500
 *    tells users and monitoring the wrong thing.
 * 3. The user never sees err.message. Full details go to the logs instead.
 **************************************************************/
module.exports = (err, req, res, next) => {
    console.error(err)

    // If a response has already started streaming, there is nothing left to
    // render on top of it. Hand it back to Express to close the connection.
    if (res.headersSent) { return next(err) }

    const rawStatus = err.status || err.statusCode
    const status = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 600
        ? rawStatus
        : 500

    // req.wantsJson is set by ensureAuthApi. The Accept check covers the routes it doesn't guard, and a direct browser visit still gets HTML
    const wantsJson = req.wantsJson === true ||
        req.xhr === true ||
        req.accepts(['html', 'json']) === 'json'

    if (wantsJson) {
        return res.status(status).json({
            error: status === 404
                ? 'Not found.'
                : 'Something went wrong. Please try again.',
        })
    }

    res.locals.user = res.locals.user || null

    res.status(status).render(status === 404 ? 'errors/404.ejs' : 'errors/500.ejs')
}
