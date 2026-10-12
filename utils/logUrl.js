/**************************************************************
 * logUrl.js
 * redactUrl() is what the request log (morgan, in server.js)
 * prints for each URL. Two things stay out of Railway's logs:
 * - a password reset link's token: /reset/<token> is logged as
 *   /reset/:token
 * - dashboard search text, which can quote a driver's remarks:
 *   q=... is logged as q=*** (URLSearchParams leaves * unencoded)
 **************************************************************/
const redactUrl = (url) => {
    if (url.startsWith('/reset/')) {
        return '/reset/:token'
    }

    const queryStart = url.indexOf('?')
    if (queryStart === -1) {
        return url
    }
    const params = new URLSearchParams(url.slice(queryStart + 1))
    if (!params.has('q')) {
        return url
    }
    params.set('q', '***')
    return `${url.slice(0, queryStart)}?${params.toString()}`
}

module.exports = { redactUrl }
