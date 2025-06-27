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
            let imageUrl;
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
                imageUrl = result.secure_url;
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
                imageUrl = result.secure_url;
            }
            console.log('Profile picture added');
            if (
                req.xhr ||
                (req.headers.accept && req.headers.accept.includes('application/json')) ||
                (req.headers['content-type'] && req.headers['content-type'].includes('application/json'))
              ) {
                return res.json({ imageUrl });
              }
            res.redirect('/profile');
        } catch(err) {
            console.error(err);
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({ error: 'Error uploading photo.' });
            }
            res.render('./errors/500.ejs')
        }
    },
    deleteProfile: async (req, res) => {
        try {
            // Only allow users to delete their own profile
            if (req.user._id.toString() !== req.params.id) {
                return res.status(403).render('./errors/404.ejs');
            }
            await User.findByIdAndDelete(req.user._id);
            req.logout(() => {
                req.session.destroy((err) => {
                    if (err) console.log('Error : Failed to destroy the session during profile deletion.', err);
                    req.user = null;
                    res.redirect('/');
                });
            });
        } catch (err) {
            console.error(err);
            res.render('./errors/500.ejs');
        }
    }
}