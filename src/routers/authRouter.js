const authController = require("../controllers/authController.js")
const router = require('express').Router()
const authMiddleware = require('../middlerwares/authMiddleware')

router.post('/login', authController.login)
router.post('/register', authController.register)
router.post('/change-password',authMiddleware.authMiddleware, authController.changePassword)


module.exports = router