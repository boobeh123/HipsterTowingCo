const { matchedData } = require('express-validator')
const User = require('../models/User')
const { UPDATED, safeReturnPath } = require('../utils/privacyPolicy')

module.exports = {

    getPrivacy: async (req, res, next) => {
      try {
          res.render('privacy.ejs');
    } catch(err) {
      next(err)
      }
    },

    /**************************************************************
    * postNoticeSeen()
    * "Got it" on the privacy policy notice (partials/privacyNotice.ejs).
    * Records which policy version this account has seen, so the notice
    * stops showing, and goes back to the page it was pressed on, if that's
    * a path on this site (safeReturnPath() in utils/privacyPolicy.js).
    **************************************************************/
    postNoticeSeen: async (req, res, next) => {
        try {
            const { returnTo } = matchedData(req)
            await User.updateOne({ _id: req.user._id }, { $set: { privacyPolicySeen: UPDATED } })
            res.redirect(safeReturnPath(returnTo))
        } catch(err) {
            next(err)
        }
    },

}
