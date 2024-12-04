const db = require("../models");
const Cart = db.cart;
const CartItem = db.cartItem;
const User = db.user;
const Product = db.product;
const Image = db.image;
const {Op} = require("sequelize");
const Yup = require("yup");

const getCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    const cart = await Cart.findOne({
      where: {
        user_id: userId,
      },
    });
    if (!cart) {
      return res.status(404).json({
        statusCode: 404,
        message: "Cart not found",
      });
    }
    const cartItems = await CartItem.findAll({
      where: {
        cart_id: cart.id,
      },
      include: [{
        model: Product,
        include: [{
          model: Image,
        }],
      }],
    });
    const mapdata = cartItems.map(item => {
      return {
        id: item.id,
        product: {
          id: item.product.id,
          title: item.product.title,
          images: item.product.images[0].url,
          totalQuantity: item.product.quantity,
          user_id: item.product.user_id,

        },
        quantity: item.quantity,
        orderedPrice: item.product.price,
      };
    });
    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: mapdata,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
}

const createCartItem = async (req, res) => {
  try {
    const schema = Yup.object().shape({
      product_id: Yup.number().required(),
      quantity: Yup.number().required(),
    });
    if (!(await schema.isValid(req.body))) {
      const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
      return res.status(400).json({
        statusCode: 400,
        message: errors.errors,
      });
    }
    const userId = req.userId;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    const {product_id, quantity} = req.body;
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({
        statusCode: 404,
        message: "Product not found",
      });
    }
    console.log(userId);
    const cart = await Cart.findOne({
      where: {
        user_id: +userId,
      },
    });
    const prices = product.price * quantity;
    const cartItem = await CartItem.create({
      product_id :+product.id,
      orderedPrice:prices,
      quantity: quantity,
      cart_id: +cart.id,
    });
    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: cartItem,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
}

const updateCartItem = async (req, res) => {
  try {
    const cartItemId = req.params.id;
    const schema = Yup.object().shape({
      quantity: Yup.number().required(),
    });
    if (!(await schema.isValid(req.body))) {
      const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
      return res.status(400).json({
        statusCode: 400,
        message: errors.errors,
      });
    }
    const cartItem = await CartItem.findOne({
      where: {
        id: cartItemId,
      },
    });
    if (!cartItem) {
      return res.status(404).json({
        statusCode: 404,
        message: "Cart item not found",
      });
    }
    const product = await Product.findByPk(cartItem.product_id);
    if (!product) {
      return res.status(404).json({
        statusCode: 404,
        message: "Product not found",
      });
    }
    if(req.body.quantity > product.quantity){
      return res.status(400).json({
        statusCode: 400,
        message: "Quantity not enough",
      });
    }
    const prices = product.price * req.body.quantity;
    const updatedData = req.body;
    await CartItem.update(
      {
        ...updatedData,
        orderedPrice: prices,
      }
      , {
      where: { id: cartItemId },
    });
    const updatedCartItem = await CartItem.findByPk(cartItemId); // Refetch to get the latest data
    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: updatedCartItem,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
}
const deleteCartItem = async (req, res) => {
  try {
    const cartItemId = req.params.id;
    const cartItem = await CartItem.findOne({
      where: {
        id: cartItemId,
      },
    });
    if (!cartItem) {
      return res.status(404).json({
        statusCode: 404,
        message: "Cart item not found",
      });
    }
    await cartItem.destroy();
    return res.status(200).json({
      statusCode: 200,
      message: "OK",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
}

const deleteAllCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    const cart = await Cart.findOne({
      where: {
        user_id: +userId,
      },
    });
    if (!cart) {
      return res.status(404).json({
        statusCode: 404,
        message: "Cart not found",
      });
    }
    await CartItem.destroy({
      where: {
        cart_id: cart.id,
      },
    });
    return res.status(200).json({
      statusCode: 200,
      message: "OK",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
}

module.exports = {
  getCartItem,
  createCartItem,
  updateCartItem,
  deleteCartItem,
  deleteAllCartItem
}