const Todo = require('../models/Todo')
const User = require('../models/User')

module.exports = {
    getTodos: async (req,res) => {
        try {
            const user = await User.findById(req.user._id)
            if (user.role === 'customer') {
                const todoItems = await Todo.find({userId:req.user.id}).lean()
                res.render('todos.ejs', {
                    todos: todoItems,
                    user: req.user})
            } else if (user.role === 'driver') {
                const todoItems = await Todo.find().sort({createdAt:-1}).lean()
                const drivers = await User.findById(req.user._id).lean();
                console.log(drivers)
                res.render('todos.ejs', {
                    todos: todoItems,
                    user: req.user,
                    drivers: drivers})
            } else {
                const todoItems = await Todo.find().sort({createdAt:-1}).lean()
                const drivers = await User.find({role: 'driver'}).lean();
                res.render('todos.ejs', {
                    todos: todoItems,
                    user: req.user,
                    drivers: drivers})
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
                vehicleLocation: req.body.vehicleLocation,
            })
            console.log('Todo has been added!')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    markComplete: async (req, res) => {
        try {
            await Todo.findOneAndUpdate({_id:req.params.id},{
                completed: true
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
                completed: false
            }).lean()
            console.log('Marked Incomplete')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    editTodos: async (req, res) => {
        try {
            let todos = await Todo.find({_id:req.params.id}).lean()
            let users = await User.find({_id:todos[0].userId}).lean()
            if (!users) {
              res.redirect('/')
            }
            
            if (users[0].email != req.user.email) {
              res.redirect('/')
            } else {
                res.render('edit', {
                users,
                todos,
                user:req.user})
            }
        } catch(error) {
            console.error(error)
        }
    },
    updateTodos: async (req, res) => {
        const currentUser = await User.find({_id:req.user._id}).lean()
        const currentTodo = await Todo.find({userId:req.user._id}).lean()
        try {
            if (!currentUser) {
                res.redirect('/')
            }
          
            if (currentUser[0].email != req.user.email) {
                res.redirect('/')
            } else {
                await Todo.findByIdAndUpdate(req.params.id, {
                completed: req.body.completed,
                contactNumber: req.body.contactNumber,
                vehicleAddressPick: req.body.vehicleAddressPick,
                vehicleAddressDrop: req.body.vehicleAddressDrop,
                contactRideAlong: req.body.contactRideAlong,
                vehicleYear: req.body.vehicleYear,
                vehicleMake: req.body.vehicleMake,
                vehicleModel: req.body.vehicleModel,
                vehicleLocation: req.body.vehicleLocation,
            })
                console.log('Edited Details')
                res.redirect('/todos')
            }
        } catch(err) {
          console.error(err)
        }
    },
    deleteTodo: async (req, res) => {
        try {
            await Todo.findOneAndDelete({_id:req.params.id})
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
        console.log(req)
        try {
            await Todo.findOneAndUpdate({_id:req.params.id},{
                assigned: false,
                assignedTo: ''
            }).lean()
            console.log('Unassigned call to driver')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    driverAccept: async (req, res) => {
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
        console.log(req.user.email)
        console.log(req.params.id)
        try {
            await Todo.findOneAndUpdate({_id:req.params.id},{
                assigned: true,
                assignedTo: req.user.email
            }).lean()
            console.log('Assigned call to driver')
            res.redirect('/todos')
        } catch(err) {
            console.log(err)
        }
    },
    getProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user._id)
            console.log(req.user)
            res.render("profile.ejs", {
                user: req.user
            });
        } catch (err) {
          console.log(err);
        }
      },
    editProfile: async (req, res) => {
        let user = await User.findById(req.user._id).lean()
        if (!user) {
            res.redirect('/')
        }
        if (user.email !== req.user.email) {
            res.redirect('/')
        } else {
            res.render('editProfile', {
            user:req.user})
        }
    },
    updateProfile: async (req, res) => {
        try {
            let user = await User.findById(req.user._id)
            if (!user) {
                res.redirect('/')
            }
            if (user.email !== req.user.email) {
                res.redirect('/')
            } else {
                await User.findByIdAndUpdate(req.user._id, {
                    name: req.body.userName,
                    email: req.body.userEmail,
            })
                console.log('Edited Profile Information')
                res.redirect('/todos')
            }
        } catch(err) {
          console.error(err)
        }
    }
}    