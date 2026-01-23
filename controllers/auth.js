const passport = require('passport')
const validator = require('validator')
const User = require('../models/User')

module.exports = {

  getLogin: async (req, res) => {

    try {
      if (req.user) {
        return res.redirect('/')
      } else {
        res.render('login.ejs');
      }
  } catch(err) {
      console.error(err)
      res.status(500).render('500.ejs');
    }
  },

  getSignup: async (req, res) => {

    try {
      if (req.user) {
        return res.redirect('/')
      } else {
        res.render('signup.ejs');
      }
  } catch(err) {
      console.error(err)
      res.status(500).render('500.ejs');
    }

  },
}