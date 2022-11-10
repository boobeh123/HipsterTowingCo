const Todo = require('../models/Todo')
const User = require('../models/User')

module.exports = {
    getTodos: async (req,res)=>{
        console.log(req.user)
        try{
            const todoItems = await Todo.find({userId:req.user.id}).lean()
            const itemsLeft = await Todo.countDocuments({userId:req.user.id,completed: false}).lean()
            res.render('todos.ejs', {
                todos: todoItems,
                left: itemsLeft,
                user: req.user,
                todoInfo: todoItems,
                todoDate: todoItems,
                todoLevel: todoItems})
        }catch(err){
            console.log(err)
        }
    },
    getSortedTodos: async (req,res)=>{
        console.log(req.user)
        try{
            const todoItems = await Todo.find({userId:req.user.id}).sort({todoLevel: -1}).lean()
            const itemsLeft = await Todo.countDocuments({userId:req.user.id,completed: false}).lean()
            res.render('todos.ejs', {
                todos: todoItems,
                left: itemsLeft,
                user: req.user,
                todoInfo: todoItems,
                todoDate: todoItems,
                todoLevel: todoItems})
        }catch(err){
            console.log(err)
        }
    },
    getDueDate: async (req,res)=>{
        console.log(req.user)
        try{
            const todoItems = await Todo.find({userId:req.user.id}).sort({todoDate: 1}).lean()
            const itemsLeft = await Todo.countDocuments({userId:req.user.id,completed: false}).lean()
            res.render('todos.ejs', {
                todos: todoItems,
                left: itemsLeft,
                user: req.user,
                todoInfo: todoItems,
                todoDate: todoItems,
                todoLevel: todoItems})
        }catch(err){
            console.log(err)
        }
    },
    createTodo: async (req, res)=>{
        try{
            await Todo.create({
                todo: req.body.todoItem,
                completed: false,
                userId: req.user.id,
                todoInfo: req.body.todoInfo,
                todoDate: req.body.todoDate,
                todoLevel: req.body.todoLevel})
            console.log('Todo has been added!')
            res.redirect('/todos')
        }catch(err){
            console.log(err)
        }
    },
    markComplete: async (req, res)=>{
        try{
            await Todo.findOneAndUpdate({_id:req.params.id},{
                completed: true
            }).lean()
            console.log('Marked Complete')
            res.redirect('/todos')
        }catch(err){
            console.log(err)
        }
    },
    markIncomplete: async (req, res)=>{
        try{
            await Todo.findOneAndUpdate({_id:req.body.todoIdFromJSFile},{
                completed: false
            }).lean()
            console.log('Marked Incomplete')
            res.json('Marked Incomplete')
        }catch(err){
            console.log(err)
        }
    },
    editTodos: async (req, res)=>{
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
                todos})
            }
        } catch(error) {
            console.error(error)
        }
    },
    updateTodos: async (req, res)=>{
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
                todo: req.body.todoItem, 
                todoInfo: req.body.todoInfo,
                completed: req.body.completed
            })
                console.log('Edited Todo')
                res.redirect('/todos')
            }
        } catch(error) {
          console.error(error)
        }
    },
    deleteTodo: async (req, res)=>{
        console.log(req.params.id)
        try{
            await Todo.findOneAndDelete({_id:req.params.id})
            console.log('Deleted Todo')
            res.redirect('/todos')
        }catch(err){
            console.log(err)
        }
    }
}    