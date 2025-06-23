const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator');
const todosController = require('../controllers/todos') 
const { ensureAuth } = require('../middleware/auth')

router.get('/', ensureAuth, todosController.getTodos)
router.get('/filtered', todosController.getFilteredTodos)

// Validation and sanitization chain for /createInspection POST Route
const createInspectionValidation = [
    
    body('truckTractorNo', 'USDOT # must be at least 3 characters long.')
        .trim()
        .isLength({ min: 3 }),

    // Sanitize all other string fields to prevent XSS
    body('trailerNo').trim().escape(),
    body('remarks').trim().escape(),
    body('defects.truckTractor.other').trim().escape(),
    body('defects.trailer.other').trim().escape(),
];
router.post('/createInspection', ensureAuth, createInspectionValidation, todosController.createInspection)

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