const validator = require('validator')
const User = require('../models/User')

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
            const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''

            if (!name) {
                req.flash('errors', [{ msg: 'Please enter your name to continue.' }])
                return req.session.save((err) => {
                    if (err) return next(err)
                    res.redirect('/onboard')
                })
            }

            if (!validator.isLength(name, { min: 1, max: 60 })) {
                req.flash('errors', [{ msg: 'Name must be between 1 and 60 characters.' }])
                return req.session.save((err) => {
                    if (err) return next(err)
                    res.redirect('/onboard')
                })
            }

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
