module.exports = {
  // For page routes — redirects unauthenticated users to home
  ensureAuth: function(req, res, next) {
      if (req.user) {
          return next()
      }
      res.redirect('/')
  },

  // For API routes — returns 401 JSON for unauthenticated requests
  ensureAuthApi: function(req, res, next) {
      if (req.user) {
          return next()
      }
      res.status(401).json({ error: 'Unauthorised' })
  }
}