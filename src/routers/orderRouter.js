const orderController = require("../controllers/orderController");
const router = require('express').Router()
const authMiddleware = require('../middlerwares/authMiddleware')

router.post('/user-order',authMiddleware.authMiddleware,  orderController.creatOrder)
router.get('/user-orders',authMiddleware.authMiddleware,  orderController.getAllOrder)
router.put('/updatePayMent',authMiddleware.authMiddleware,  orderController.updatePayMent)
router.put('/updateStatus',authMiddleware.authMiddleware,  orderController.updateStatus)
router.get('/status-buy-products',authMiddleware.authMiddleware,  orderController.getStatusBuyProduct)
router.get('/order-sales',authMiddleware.authMiddleware,  orderController.getOrderItemByUserId)
router.get('/dashboard-month',authMiddleware.authMiddleware,  orderController.getDashBoardProduct)
router.get('/status-order-sale',authMiddleware.authMiddleware,  orderController.getOrderStatusSale)
router.get('/user-order/:id',authMiddleware.authMiddleware,  orderController.getOrderById)

module.exports = router