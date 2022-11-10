const express = require('express')
const router = express.Router()
const todosController = require('../controllers/todos') 
const { ensureAuth } = require('../middleware/auth')

router.get('/', ensureAuth, todosController.getTodos)
router.get('/sorted', ensureAuth, todosController.getSortedTodos)
router.get('/dueDate', ensureAuth, todosController.getDueDate)

router.post('/createTodo', todosController.createTodo)

router.put('/markComplete/:id', todosController.markComplete)
router.get('/edit/:id', todosController.editTodos)
router.put('/:id', todosController.updateTodos)
router.put('/markIncomplete', todosController.markIncomplete)

router.delete('/deleteTodo/:id', todosController.deleteTodo)

module.exports = router