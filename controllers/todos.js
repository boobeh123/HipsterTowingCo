const Todo = require('../models/Todo')
const User = require('../models/User')
const cloudinary = require("../middleware/cloudinary");

module.exports = {
    getTodos: async (req,res) => {
        try {
            const loggedInUser = await User.findById(req.user.id).lean()
            const allDrivers = await User.find({role: 'Driver'}).lean();
            if (loggedInUser.role === 'Customer') {
                const customerRequests = await Todo.find({userId:req.user.id}).lean()
                res.render('todos.ejs', {
                    todos: customerRequests,
                    user: loggedInUser,
                    drivers: allDrivers})
            } else {
                const allRequests = await Todo.find().sort({createdAt:-1}).lean()
                res.render('todos.ejs', {
                    todos: allRequests,
                    user: loggedInUser,
                    drivers: allDrivers})
                }
        } catch(err) {
            console.log(err)
        }
    },
    createTodo: async (req, res) => {
        try {
            await Todo.create({
                completed: false,
                assigned: false,
                assignedTo: '',
                accepted: false,
                driverStatus: '',
                userId: req.user.id,
                contactNumber: req.body.contactNumber,
                vehicleAddressPick: req.body.vehicleAddressPick,
                vehicleAddressDrop: req.body.vehicleAddressDrop,
                contactRideAlong: req.body.contactRideAlong,
                vehicleType: req.body.vehicleType,
                vehicleDoor: req.body.vehicleDoor,
                vehicleColor: req.body.vehicleColor,
                vehicleYear: req.body.vehicleYear,
                vehicleMake: req.body.vehicleMake,
                vehicleModel: req.body.vehicleModel,
                customerNotes: req.body.customerNotes,
            })
            console.log('Call has been added!')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    markComplete: async (req, res) => {
        try {
            await Todo.findOneAndUpdate({_id:req.params.id},{
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
            await Todo.findOneAndUpdate({_id:req.params.id},{
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
            let currentCall = await Todo.find({_id:req.params.id}).lean()
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
                await Todo.findByIdAndUpdate(req.params.id, {
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
        }
    },
    deleteTodo: async (req, res) => {
        try {
            await Todo.findOneAndDelete({_id:req.params.id}).lean()
            console.log('Deleted call')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    dispatchAssignDriver: async (req, res) => {
        try {
            await Todo.findOneAndUpdate({_id:req.params.id},{
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
            await Todo.findOneAndUpdate({_id:req.params.id},{
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
                await Todo.findOneAndUpdate({_id:req.params.id},{
                    accepted: true,
                    driverStatus: req.body.driverStatus
                }).lean()
                console.log('Driver updated status')
                res.redirect('/todos')
            } else {
                await Todo.findOneAndUpdate({_id:req.params.id},{
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
            await Todo.findOneAndUpdate({_id:req.params.id},{
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
            res.render("profile.ejs", {
                user: req.user
            });
        } catch (err) {
          console.log(err);
        }
      },
    editProfile: async (req, res) => {
        let loggedInUser = await User.findById(req.user._id).lean()
        if (!loggedInUser) {
            res.redirect('/')
        }
        if (loggedInUser.email !== req.user.email) {
            res.redirect('/')
        } else {
            res.render('editProfile', {
            user:req.user})
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
        }
    }
}    