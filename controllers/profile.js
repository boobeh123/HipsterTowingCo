const User = require('../models/User')
const cloudinary = require('../middleware/cloudinary')

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
            if (req.user.cloudinaryId) {
                await cloudinary.uploader.destroy(req.user.cloudinaryId)
            }

            const result = await cloudinary.uploader.upload(req.file.path, {
                width: 200,
                height: 200,
                gravity: 'faces',
                crop: 'thumb',
            })

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
