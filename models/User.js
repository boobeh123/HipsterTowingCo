const bcrypt = require('bcrypt')
const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  role: { 
    type: String,
  },
  email: { 
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true 
  },
  name: { 
    type: String,
    required: false,
    trim: true,
    maxLength: 60,
    default: ''
  },
  password: {
    type: String,
    required: true
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
  // Set when the Terms of Use checkbox is ticked at signup
  termsAcceptedAt: Date,
  // lastLogin: {
  //   type: Date,
  //   default: Date.now
  // },
  // isActive: {
  //   type: Boolean,
  //   default: true
  // },
}, 
    { timestamps: true }
)

// Password hash middleware
UserSchema.pre('save', async function save() {
  if (!this.isModified('password')) { return }
  // Cost 12. Existing hashes store the cost they were created with, so
  // passwords hashed at 10 keep verifying; only new ones use 12.
  this.password = await bcrypt.hash(this.password, 12)
})

// Helper method for validating user's password
UserSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch)
  })
}

module.exports = mongoose.model('User', UserSchema)
