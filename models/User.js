const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const validator = require('validator')

const UserSchema = new mongoose.Schema({
  role: { 
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  email: { 
    type: String, 
    unique: true,
    required: [true, 'Email is required'],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  name: { 
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't return password in queries by default
  },
  isAdmin: {
    type: Boolean, 
    default: false 
  },
  image: { 
    type: String,
    default: ''
  },
  cloudinaryId: { 
    type: String 
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  agreedToTerms: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
})

UserSchema.index({ email: 1 })
UserSchema.index({ role: 1 })

// Password hash middleware
UserSchema.pre('save', function save(next) {
  const user = this
  if (!user.isModified('password')) { return next() }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) { return next(err) }
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) { return next(err) }
      user.password = hash
      next()
    })
  })
})

// Helper method for validating user's password
UserSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch)
  })
}

// Virtual for user's full profile URL
UserSchema.virtual('profileUrl').get(function() {
  return `/profile/${this._id}`
})

// Method to check if user is admin
UserSchema.methods.isAdminUser = function() {
  return this.role === 'Admin' || this.isAdmin === true
}

module.exports = mongoose.model('User', UserSchema)
