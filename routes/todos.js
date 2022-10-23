const express = require('express')
const router = express.Router()
const todosController = require('../controllers/todos') 
const { ensureAuth } = require('../middleware/auth')

router.get('/', ensureAuth, todosController.getTodos)
router.get('/sorted', ensureAuth, todosController.getSortedTodos)
router.get('/dueDate', ensureAuth, todosController.getDueDate)

router.post('/createTodo', todosController.createTodo)

router.put('/markComplete', todosController.markComplete)

router.put('/markIncomplete', todosController.markIncomplete)
// router.put('/editTodos', todosController.editTodos)

router.delete('/deleteTodo', todosController.deleteTodo)

module.exports = router