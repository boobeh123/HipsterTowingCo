const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator');
const todosController = require('../controllers/todos') 
const { ensureAuth } = require('../middleware/auth')

// router.get('/', ensureAuth, todosController.getTodos)
// router.get('/loadmore', ensureAuth, todosController.getMoreInspections)
// router.get('/view/:id', ensureAuth, todosController.viewInspection)
// router.get('/search', ensureAuth, todosController.searchTodos)

// router.post('/createInspection', ensureAuth, createInspectionValidation, todosController.createInspection)

// router.delete('/:id', ensureAuth, todosController.deleteInspection)

module.exports = router