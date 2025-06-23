const Inspection = require('../models/Todo')
const User = require('../models/User')
const { validationResult } = require('express-validator');
const cloudinary = require("../middleware/cloudinary");

module.exports = {
    getTodos: async (req,res) => {
        try {
            const pageName = 'Dashboard'
            const loggedInUser = await User.findById(req.user.id).lean()
            const allDrivers = await User.find({role: 'Driver'}).lean();
            
            const inspections = await Inspection.find({userId: req.user.id}).sort({ createdAt: -1 }).lean()
            
            res.render('todos.ejs', {
                todos: inspections,
                user: loggedInUser,
                drivers: allDrivers,
                page: pageName
            })
        } catch(err) {
            console.log(err)
            res.render('./errors/500.ejs')
        }
    },
    getFilteredTodos: async (req,res)=>{
        console.log(req.user)
        try{
            const pageName = 'Dashboard'
            const loggedInUser = await User.findById(req.user.id).lean()
            const allDrivers = await User.find({role: 'Driver'}).lean();
            if (loggedInUser.role === 'Customer') {
                const customerRequests = await Inspection.find({userId:req.user.id, completed:false}).lean()
                res.render('todos.ejs', {
                    todos: customerRequests,
                    user: loggedInUser,
                    drivers: allDrivers,
                    page: pageName})
            } else {
                const pageName = 'Dashboard'
                const allRequests = await Inspection.find({completed:false}).sort({createdAt:-1}).lean()
                res.render('todos.ejs', {
                    todos: allRequests,
                    user: loggedInUser,
                    drivers: allDrivers,
                    page: pageName})
                }
        }catch(err){
            console.log(err)
        }
    },
    createInspection: async (req, res) => {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // If there are errors, send them back to the client
            const errorMessages = errors.array().map(error => error.msg).join(' ');
            return res.status(400).json({ success: false, message: errorMessages });
        }

        try {
            // Data is sent as JSON from the client-side fetch
            const inspectionData = req.body;

            await Inspection.create({
                ...inspectionData,
                userId: req.user.id
            });
            
            console.log('Inspection has been added!');
            
            res.status(201).json({ success: true, message: 'Inspection created successfully.' });

        } catch (err) {
            console.error('Error creating inspection:', err);
            // Check for Mongoose validation error
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(val => val.message);
                return res.status(400).json({ success: false, message: messages.join(' ') });
            }
            res.status(500).json({ success: false, message: 'Failed to create inspection report.' });
        }
    },
    markComplete: async (req, res) => {
        try {
            await Inspection.findOneAndUpdate({_id:req.params.id},{
                completed: true,
                driverStatus: 'Clear'
            }).lean()
            console.log('Marked Complete')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    markIncomplete: async (req, res) => {
        try {
            await Inspection.findOneAndUpdate({_id:req.params.id},{
                completed: false,
                driverStatus: ''
            }).lean()
            console.log('Marked Incomplete')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    editTodos: async (req, res) => {
        try {
            let currentCall = await Inspection.find({_id:req.params.id}).lean()
            let loggedInUser = await User.findById(req.user.id).lean()

            if (!loggedInUser) {
              res.redirect('/')
            }
            
            if (loggedInUser.email !== req.user.email) {
              res.redirect('/')
            } else {
                res.render('edit', {
                    todos: currentCall,
                    user: req.user})
            }
        } catch(error) {
            console.error(error)
            res.render('./errors/500.ejs')
        }
    },
    updateTodos: async (req, res) => {
        try {
            let loggedInUser = await User.findById(req.user.id).lean()

            if (!loggedInUser) {
                res.redirect('/')
            }
          
            if (loggedInUser.email !== req.user.email) {
                res.redirect('/')
            } else {
                await Inspection.findByIdAndUpdate(req.params.id, {
                contactNumber: req.body.contactNumber,
                vehicleAddressPick: req.body.vehicleAddressPick,
                vehicleAddressDrop: req.body.vehicleAddressDrop,
                contactRideAlong: req.body.contactRideAlong,
                vehicleYear: req.body.vehicleYear,
                vehicleMake: req.body.vehicleMake,
                vehicleModel: req.body.vehicleModel,
                customerNotes: req.body.customerNotes,
            }).lean()
                console.log('Edited Details')
                res.redirect('/todos')
            }
        } catch(err) {
          console.error(err)
          res.render('./errors/500.ejs')
        }
    },
    deleteTodo: async (req, res) => {
        try {
            await Inspection.findOneAndDelete({_id:req.params.id}).lean()
            console.log('Deleted call')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    dispatchAssignDriver: async (req, res) => {
        try {
            await Inspection.findOneAndUpdate({_id:req.params.id},{
                assigned: true,
                assignedTo: req.body.assignedTo
            }).lean()
            console.log('Assigned call to driver')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    dispatchUnassignDriver: async (req, res) => {
        try {
            await Inspection.findOneAndUpdate({_id:req.params.id},{
                assigned: false,
                assignedTo: '',
                driverStatus: ''
            }).lean()
            console.log('Unassigned call to driver')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    driverUpdateETA: async (req, res) => {
        try {
            if (req.body.driverStatus !== 'Clear') {
                await Inspection.findOneAndUpdate({_id:req.params.id},{
                    accepted: true,
                    driverStatus: req.body.driverStatus
                }).lean()
                console.log('Driver updated status')
                res.redirect('/todos')
            } else {
                await Inspection.findOneAndUpdate({_id:req.params.id},{
                    accepted: true,
                    completed: true,
                    driverStatus: req.body.driverStatus
                }).lean()
                console.log('Driver updated status')
                res.redirect('/todos')
            }
        } catch(err) {
            console.log(err)
        }
    },
    driverAssignDriver: async (req, res) => {
        try {
            await Inspection.findOneAndUpdate({_id:req.params.id},{
                assigned: true,
                assignedTo: req.user._id
            }).lean()
            console.log('Assigned call to driver')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
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
    },
    setRole: async (req, res) => {
        try {
            let loggedInUser = await User.findById(req.user._id).lean()
            if (!loggedInUser) {
                res.redirect('/')
            }
            if (loggedInUser.email !== req.user.email) {
                res.redirect('/')
            } else {
                await User.findByIdAndUpdate(req.body.userId, {
                    role: req.body.role
            })
                console.log('Set account privilege')
                res.redirect('/profile')
            }
        } catch(err) {
          console.error(err)
          res.render('./errors/404.ejs')
        }
    }
}    