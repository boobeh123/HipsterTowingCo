const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth') 
const homeController = require('../controllers/home')
const passwordResetController = require('../controllers/reset')
const privacyController = require('../controllers/privacy')


router.get('/', homeController.getIndex)
router.get('/login', authController.getLogin)
router.post('/login', authController.postLogin)
router.get('/logout', authController.logout)
router.get('/signup', authController.getSignup)
router.post('/signup', authController.postSignup)
router.get('/forgot', passwordResetController.getPasswordReset)
router.post('/forgot', passwordResetController.postPasswordReset)
router.get('/reset/:token', passwordResetController.getRecoverPassword)
router.post('/reset/:token', passwordResetController.postRecoverPassword)
router.get('/privacy', privacyController.getPrivacy)

module.exports = router