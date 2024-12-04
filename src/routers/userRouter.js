const userController = require("../controllers/userController.js")
const router = require('express').Router()
const authMiddleware = require('../middlerwares/authMiddleware')

router.get('/product-by-user',authMiddleware.authMiddleware, userController.getProductByUser)
router.get('/products', userController.getProductAll)
router.get('/product-by-id/:id',authMiddleware.authMiddleware, userController.getProductById)
router.get('/product-by-category/:id', userController.getProductByCategory)
router.post('/product',authMiddleware.isSale, userController.createProduct)
router.get('/categories', userController.getCategory)
router.delete('/product/:id',authMiddleware.authMiddleware, userController.deleteProduct)
router.put('/product/:id',authMiddleware.authMiddleware, userController.updateProduct)
router.post('/update-category', userController.updateCategory)
router.get('/information', authMiddleware.authMiddleware,userController.getInforById)
router.put('/information',authMiddleware.authMiddleware, userController.updateInformation)
router.post('/address',authMiddleware.authMiddleware, userController.createAddress)
router.get('/places',authMiddleware.authMiddleware, userController.getAddress)
router.put('/address/:id',authMiddleware.authMiddleware, userController.updateAddress)
router.delete('/address/:id',authMiddleware.authMiddleware, userController.deleteAddress)
router.post('/create-category', userController.createCategory)
router.post('/request-sale',authMiddleware.authMiddleware, userController.requestSale)




module.exports = router