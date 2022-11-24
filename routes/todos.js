const express = require('express')
const router = express.Router()
const todosController = require('../controllers/todos') 
const { ensureAuth } = require('../middleware/auth')

router.get('/', ensureAuth, todosController.getTodos)

router.post('/createTodo', todosController.createTodo)

router.put('/markComplete/:id', todosController.markComplete)
router.put('/markIncomplete/:id', todosController.markIncomplete)
router.get('/edit/:id', todosController.editTodos)
router.put('/:id', todosController.updateTodos)
router.put('/assignTo/:id', todosController.dispatchAssignDriver)
router.put('/unassign/:id', todosController.dispatchUnassignDriver)
router.put('/assignSelf/:id', todosController.driverAssignDriver)
router.put('/accepted/:id', todosController.driverUpdateETA)

router.delete('/deleteTodo/:id', todosController.deleteTodo)

module.exports = router