const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth') 
const homeController = require('../controllers/home')
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const passwordResetController = require('../controllers/reset')
const todosController = require('../controllers/todos')
const upload = require("../middleware/multer");

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

router.get("/profile", ensureAuth, todosController.getProfile);
router.get("/profile/edit/:id", ensureAuth, todosController.editProfile);
router.put("/profile/edit/:id", ensureAuth, todosController.updateProfile);
router.post("/profile", ensureAuth, upload.single("file"), todosController.updatePhoto);
router.post("/profile/setRole", ensureAuth, todosController.setRole);

// Scanner routes - TODO MVC architecture, testing feature
router.get('/scanner', ensureAuth, (req, res) => {
  res.render('scanner.ejs')
})

module.exports = router