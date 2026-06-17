const LocalStrategy = require('passport-local').Strategy
const User = require('../models/User')

module.exports = function (passport) {
  passport.use(new LocalStrategy({ usernameField: 'email' }, function verify(email, password, done) {
    User.findOne({ email: email }, function (err, user) {
      if (err) { return done(err) }
      if (!user) { return done(null, false, { message: 'Incorrect email or password.' }) }
      user.comparePassword(password, function(err, isMatch) {
        if (err) { return done(err) }
        if (!isMatch) { return done(null, false, { message: 'Incorrect email or password.' }) }
        return done(null, user)
      })
    })
  }))

  passport.serializeUser(function(user, done) {
    process.nextTick(function() {
      done(null, user.id)
    })
  })

  passport.deserializeUser(function(id, done) {
    process.nextTick(async function() {
      try {
        const user = await User.findById(id)
        done(null, user)
      } catch (err) {
        done(err)
      }
    })
  })

}
