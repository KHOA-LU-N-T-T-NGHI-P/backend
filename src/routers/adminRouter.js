const adminController = require("../controllers/adminController")
const router = require('express').Router()
const authMiddleware = require('../middlerwares/authMiddleware')
const orderController = require("../controllers/orderController");
const userController = require("../controllers/userController");

router.post('/create-registerDev',adminController.registerDev)

router.put('/user-sale',authMiddleware.isAmin,  adminController.updateSale)
router.put('/status-product',authMiddleware.isAmin, adminController.updateStatusProduct)
router.put('/user-status',authMiddleware.isAmin, adminController.updateStatusUser)
router.get('/products',authMiddleware.isAmin, adminController.getProductAll)
router.get('/product/:id',authMiddleware.isAmin,  userController.getProductById)
router.get('/users',authMiddleware.isAmin, adminController.getUserAll)
router.get('/user/:id',authMiddleware.isAmin, adminController.getUserById)
router.get('/users/top-ten',authMiddleware.isAmin, adminController.topTenUser)
router.get('/user-sales',authMiddleware.isAmin, adminController.getAllDashBoardProduct)
router.get('/products/top-ten',authMiddleware.isAmin, adminController.topTenProductSale)
router.get("/dash-board", authMiddleware.isAmin, adminController.getDashBoard)
router.post("/user/pay-sale", authMiddleware.isAmin, adminController.payForUser)
router.get("/orders", authMiddleware.isAmin, adminController.getAllOrder)
router.put("/visible-product", authMiddleware.isAmin, adminController.updateIsVisibleProduct)
router.put("/order/status", authMiddleware.isAmin,orderController.updateStatus )
router.put("/order/payment", authMiddleware.isAmin,orderController.updatePayMent )




module.exports = router