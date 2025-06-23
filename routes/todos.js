const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator');
const todosController = require('../controllers/todos') 
const { ensureAuth } = require('../middleware/auth')

router.get('/', ensureAuth, todosController.getTodos)
router.get('/loadmore', ensureAuth, todosController.getMoreInspections)

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

router.delete('/:id', ensureAuth, todosController.deleteInspection)

module.exports = router