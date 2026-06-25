const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth') 
const homeController = require('../controllers/home')
const onboardController = require('../controllers/onboard')
const passwordResetController = require('../controllers/reset')
const privacyController = require('../controllers/privacy')
const termController = require('../controllers/terms')
const inspectionController = require('../controllers/inspection')
const dashboardController = require('../controllers/dashboard')
const profileController = require('../controllers/profile')
const upload = require('../middleware/multer')
const { ensureAuth, ensureAuthApi, ensureOnboarding } = require('../middleware/auth')

router.get('/', homeController.getIndex)
router.get('/dashboard', ensureAuth, dashboardController.getDashboard)
router.get('/inspections/:id', ensureAuthApi, inspectionController.getInspection)
router.post('/inspections/count', homeController.postInspectionCount)
router.post('/inspections', ensureAuthApi, inspectionController.postInspection)
router.delete('/inspections/:id', ensureAuth, inspectionController.deleteInspection)

router.get('/onboard', ensureOnboarding, onboardController.getOnboard)
router.post('/onboard', ensureOnboarding, onboardController.postOnboard)

router.get('/profile', ensureAuth, profileController.getProfile)
router.post('/profile/photo', ensureAuth, upload.single('file'), profileController.updatePhoto)
router.delete('/profile/delete', ensureAuth, profileController.deleteAccount)

router.get('/login', authController.getLogin)
router.post('/login', authController.postLogin)
router.get('/logout', authController.getLogout)
router.get('/signup', authController.getSignup)
router.post('/signup', authController.postSignup)
router.get('/forgot', passwordResetController.getPasswordReset)
router.post('/forgot', passwordResetController.postPasswordReset)
router.get('/reset/:token', passwordResetController.getRecoverPassword)
router.post('/reset/:token', passwordResetController.postRecoverPassword)

router.get('/privacy', privacyController.getPrivacy)
router.get('/terms', termController.getTerms)


module.exports = router
