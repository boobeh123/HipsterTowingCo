const express = require('express')
const router = express.Router()
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const profileController = require('../controllers/profile') 
const upload = require("../middleware/multer");

// router.get("/", ensureAuth, profileController.getProfile);
// router.get("/edit/:id", ensureAuth, profileController.editProfile);
// router.put("/edit/:id", ensureAuth, profileController.updateProfile);
// router.post("/", ensureAuth, upload.single("file"), profileController.updatePhoto);
// router.delete("/delete/:id", ensureAuth, profileController.deleteProfile);

module.exports = router