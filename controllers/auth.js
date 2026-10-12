const passport = require('passport')
const { matchedData } = require('express-validator')
const User = require('../models/User')
const { formErrors } = require('../middleware/validators')
const { markLoginTime } = require('../middleware/auth')

const EMAIL_TAKEN = 'An account with that email address already exists.'

module.exports = {

  getLogin: async (req, res, next) => {
    try {
      if (req.user) {
        return res.redirect('/')
      }
      res.render('login.ejs')
    } catch(err) {
      next(err)
    }
  },

  postLogin: (req, res, next) => {
    const errors = formErrors(req)
    if (!errors.isEmpty()) {
      req.flash('errors', errors.array())
      return req.session.save((err) => {
        if (err) { return next(err) }
        res.redirect('/login')
      })
    }

    // validateLogin has already normalised req.body.email, the field
    // passport-local reads
    passport.authenticate('local', (err, user, info) => {
      if (err) { return next(err) }
      if (!user) {
        req.flash('errors', [{ msg: info.message || 'Incorrect email or password.' }])
        return req.session.save((err) => {
          if (err) { return next(err) }
          res.redirect('/login')
        })
      }
      req.logIn(user, (err) => {
        if (err) { return next(err) }
        markLoginTime(req)
        req.flash('success', 'Welcome back.')
        req.session.save((err) => {
          if (err) { return next(err) }
          res.redirect('/')
        })
      })
    })(req, res, next)
  },

  postLogout: (req, res, next) => {
    req.logout(function(err) {
      if (err) { return next(err) }
      req.session.destroy(function(err) {
        if (err) { return next(err) }
        res.redirect('/')
      })
    })
  },

  getSignup: async (req, res, next) => {
    try {
      if (req.user) {
        return res.redirect('/')
      }
      res.render('signup.ejs')
    } catch(err) {
      next(err)
    }
  },

  postSignup: async (req, res, next) => {
    const errors = formErrors(req)
    if (!errors.isEmpty()) {
      req.flash('errors', errors.array())
      return req.session.save((err) => {
        if (err) { return next(err) }
        res.redirect('/signup')
      })
    }

    const { email, password } = matchedData(req)

    try {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        req.flash('errors', [{ msg: EMAIL_TAKEN }])
        return req.session.save((err) => {
          if (err) { return next(err) }
          res.redirect('/signup')
        })
      }

      const user = new User({
        role: 'user',
        email,
        password,
        name: '',
        image: '',
        cloudinaryId: '',
        // validateSignup only lets the form through with the box ticked
        termsAcceptedAt: new Date(),
      })

      await user.save()

      req.login(user, function(err) {
        if (err) { return next(err) }
        markLoginTime(req)
        req.session.save((err) => {
          if (err) { return next(err) }
          res.redirect('/onboard')
        })
      })
    } catch(err) {
      // Two signups for the same address at once: the unique email index
      // rejects the second, which gets the same message as the check above
      if (err.code === 11000) {
        req.flash('errors', [{ msg: EMAIL_TAKEN }])
        return req.session.save((saveErr) => {
          if (saveErr) { return next(saveErr) }
          res.redirect('/signup')
        })
      }
      return next(err)
    }
  },

}
