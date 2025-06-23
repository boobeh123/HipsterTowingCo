const User = require('../models/User')
const cloudinary = require("../middleware/cloudinary");

module.exports = {
    getProfile: async (req, res) => {
        try {
            let pageName = 'Profile'
            let allUsers = await User.find().lean();
            res.render("profile.ejs", {
                user: req.user,
                users: allUsers,
                page: pageName
            });
        } catch (err) {
        console.log(err);
        res.render('./errors/500.ejs')
        }
    },
    editProfile: async (req, res) => {
        try {
            let pageName = 'Profile'
            let loggedInUser = await User.findById(req.user._id).lean()
            if (!loggedInUser) {
                res.redirect('/')
            }
            if (loggedInUser.email !== req.user.email) {
                res.redirect('/')
            } else {
                res.render('editProfile', {
                user:req.user,
                page: pageName})
            }
        } catch(err) {
            console.log(err);
        res.render('./errors/500.ejs')
        }
    },
    updateProfile: async (req, res) => {
        try {
            let loggedInUser = await User.findById(req.user._id).lean()
            if (!loggedInUser) {
                res.redirect('/')
            }
            if (loggedInUser.email !== req.user.email) {
                res.redirect('/')
            } else {
                await User.findByIdAndUpdate(req.user._id, {
                    name: req.body.userName,
                    email: req.body.userEmail,
            })
                console.log('Edited Profile Information')
                res.redirect('/profile')
            }
        } catch(err) {
        console.error(err)
        res.render('./errors/404.ejs')
        }
    },
    updatePhoto: async (req, res) => {
        try {
            if (req.user.image === '') {
                const result = await cloudinary.uploader.upload(req.file.path, {
                    width: 100, 
                    height: 100, 
                    gravity: "faces", 
                    crop: "thumb"
                });
                await User.findByIdAndUpdate(req.user.id, {
                    image: result.secure_url,
                    cloudinaryId: result.public_id
                })
            } else {
                await cloudinary.uploader.destroy(req.user.cloudinaryId)
                const result = await cloudinary.uploader.upload(req.file.path, {
                    width: 100, 
                    height: 100, 
                    gravity: "faces", 
                    crop: "thumb"
                });
                await User.findByIdAndUpdate(req.user.id, {
                    image: result.secure_url,
                    cloudinaryId: result.public_id
            })
        }
            console.log('Profile picture added')
            res.redirect('/profile')
        } catch(err) {
            console.error(err);
            res.render('./errors/500.ejs')
        }
    }
}