const cartController = require("../controllers/cartController");
const router = require('express').Router()
const authMiddleware = require('../middlerwares/authMiddleware')
router.post('/cart-item',authMiddleware.authMiddleware, cartController.createCartItem)
router.get('/cart-items',authMiddleware.authMiddleware, cartController.getCartItem)
router.put('/cart-item/:id',authMiddleware.authMiddleware, cartController.updateCartItem)
router.delete('/cart-item/:id',authMiddleware.authMiddleware, cartController.deleteCartItem)
router.delete('/cart-item-user',authMiddleware.authMiddleware, cartController.deleteAllCartItem)


module.exports = router