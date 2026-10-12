const fs = require('fs')
const { matchedData } = require('express-validator')
const User = require('../models/User')
const cloudinary = require('../middleware/cloudinary')
const { formErrors } = require('../middleware/validators')
const { markLoginTime } = require('../middleware/auth')

// Flash-then-redirect back to the profile page. The session is saved
// first, or the redirect can outrun the write and the message is lost.
const flashToProfile = (req, res, next, type, message) => {
    req.flash(type, message)
    req.session.save((err) => {
        if (err) { return next(err) }
        res.redirect('/profile')
    })
}

// user.comparePassword() takes a callback; this wraps it in a promise
const passwordMatches = (user, candidate) => new Promise((resolve, reject) => {
    user.comparePassword(candidate, (err, isMatch) => (err ? reject(err) : resolve(isMatch)))
})

module.exports = {

    getProfile: async (req, res, next) => {
        try {
            res.render('profile.ejs')
        } catch(err) {
            next(err)
        }
    },

    updatePhoto: async (req, res, next) => {
        try {
            // The <input> contains required attribute. A direct POST with no file would throw on req.file.path below.
            if (!req.file) {
                req.flash('errors', [{ msg: 'Please choose a photo to upload.' }])
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('/profile')
                })
            }

            let result
            try {
                result = await cloudinary.uploader.upload(req.file.path, {
                    width: 200,
                    height: 200,
                    gravity: 'faces',
                    crop: 'thumb',
                })
            } finally {
                // Multer writes the upload to the OS temp directory and doesn't remove it
                // once it hands the request on. Clean it up whether or not Cloudinary
                // accepted it. A failed unlink shouldn't fail the user's upload
                await fs.promises.unlink(req.file.path).catch(() => {})
            }

            // Destroy the previous upload only after the replacement is safely stored,
            if (req.user.cloudinaryId) {
                await cloudinary.uploader.destroy(req.user.cloudinaryId)
            }

            await User.findByIdAndUpdate(req.user._id, {
                image: result.secure_url,
                cloudinaryId: result.public_id,
            })

            req.flash('success', 'Profile photo updated.')
            req.session.save((err) => {
                if (err) { return next(err) }
                res.redirect('/profile')
            })
        } catch(err) {
            next(err)
        }
    },

    updateName: async (req, res, next) => {
        try {
            const errors = formErrors(req)
            if (!errors.isEmpty()) {
                return flashToProfile(req, res, next, 'errors', errors.array())
            }

            const { name } = matchedData(req)
            await User.findByIdAndUpdate(req.user._id, { name })

            // The header shows the name, so update it for this request too
            req.user.name = name

            flashToProfile(req, res, next, 'success', 'Your name has been updated.')
        } catch(err) {
            next(err)
        }
    },

    updatePassword: async (req, res, next) => {
        try {
            const errors = formErrors(req)
            if (!errors.isEmpty()) {
                return flashToProfile(req, res, next, 'errors', errors.array())
            }

            const { currentPassword, password } = matchedData(req)

            // req.user leaves the password hash out (config/passport.js),
            // so load the whole account to check the current password
            const user = await User.findById(req.user._id)
            if (!user || !(await passwordMatches(user, currentPassword))) {
                return flashToProfile(req, res, next, 'errors', [{ msg: 'Your current password is incorrect.' }])
            }
            if (await passwordMatches(user, password)) {
                return flashToProfile(req, res, next, 'errors', [{ msg: 'Choose a new password that is different from your current one.' }])
            }

            user.password = password
            // Signs the account out on every other device (see endStaleSessions)
            user.passwordChangedAt = new Date()
            await user.save()

            // Logging in again gives this browser a fresh session, recorded
            // after the change, so endStaleSessions keeps it signed in
            req.login(user, (err) => {
                if (err) { return next(err) }
                markLoginTime(req)
                flashToProfile(req, res, next, 'success', 'Your password has been changed. Any other devices have been signed out.')
            })
        } catch(err) {
            next(err)
        }
    },

    deleteAccount: async (req, res, next) => {
        try {
            const Inspection = require('../models/Inspection')

            // Remove Cloudinary asset if present
            if (req.user.cloudinaryId) {
                await cloudinary.uploader.destroy(req.user.cloudinaryId)
            }

            // Delete all inspections belonging to this user
            await Inspection.deleteMany({ userId: req.user._id })

            // Delete the user document
            await User.findByIdAndDelete(req.user._id)

            req.logout(function(err) {
                if (err) { return next(err) }
                req.session.destroy(function(err) {
                    if (err) { return next(err) }
                    res.redirect('/')
                })
            })
        } catch(err) {
            next(err)
        }
    },

}
