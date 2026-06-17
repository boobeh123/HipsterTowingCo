const passport = require('passport')
const validator = require('validator')
const User = require('../models/User')

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
    const validationErrors = []
    if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' })
    if (!validator.isLength(req.body.password, { min: 5 })) validationErrors.push({ msg: 'Password must be at least 5 characters long.' })

    if (validationErrors.length) {
      req.flash('errors', validationErrors)
      return req.session.save((err) => {
        if (err) { return next(err) }
        res.redirect('/login')
      })
    }
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false })

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
        req.flash('success', 'Welcome back.')
        req.session.save((err) => {
          if (err) { return next(err) }
          res.redirect('/')
        })
      })
    })(req, res, next)
  },

  getLogout: (req, res, next) => {
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
    const validationErrors = []
    if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' })
    if (!validator.isLength(req.body.password, { min: 5 })) validationErrors.push({ msg: 'Password must be at least 5 characters long.' })
    if (req.body.password !== req.body.confirmPassword) validationErrors.push({ msg: 'Passwords do not match.' })

    if (validationErrors.length) {
      req.flash('errors', validationErrors)
      return req.session.save((err) => {
        if (err) { return next(err) }
        res.redirect('/signup')
      })
    }
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false })

    try {
      const existingUser = await User.findOne({ email: req.body.email })
      if (existingUser) {
        req.flash('errors', [{ msg: 'An account with that email address already exists.' }])
        return req.session.save((err) => {
          if (err) { return next(err) }
          res.redirect('/signup')
        })
      }

      const user = new User({
        role: 'user',
        email: req.body.email,
        password: req.body.password,
        name: '',
        image: '',
        cloudinaryId: '',
      })

      await user.save()

      req.login(user, function(err) {
        if (err) { return next(err) }
        req.flash('success', 'Account created. Welcome to pretriq.')
        req.session.save((err) => {
          if (err) { return next(err) }
          res.redirect('/')
        })
      })
    } catch(err) {
      return next(err)
    }
  },

}
