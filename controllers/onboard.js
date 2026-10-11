const { matchedData } = require('express-validator')
const User = require('../models/User')
const { formErrors } = require('../middleware/validators')

module.exports = {

    getOnboard: async (req, res, next) => {
        try {
            res.render('onboard.ejs')
        } catch(err) {
            next(err)
        }
    },

    postOnboard: async (req, res, next) => {
        try {
            const errors = formErrors(req)
            if (!errors.isEmpty()) {
                req.flash('errors', errors.array())
                return req.session.save((err) => {
                    if (err) return next(err)
                    res.redirect('/onboard')
                })
            }

            const { name } = matchedData(req)
            await User.findByIdAndUpdate(req.user._id, { name })

            // Update the in-memory user object so any middleware running
            // in this same request cycle sees the updated name immediately
            req.user.name = name

            req.flash('success', `Welcome to pretriq, ${name}.`)
            req.session.save((err) => {
                if (err) return next(err)
                res.redirect('/dashboard')
            })
        } catch(err) {
            next(err)
        }
    },

}
