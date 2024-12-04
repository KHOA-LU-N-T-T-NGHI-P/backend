// Init
const db = require('../models');
const User = db.user;
const Image = db.image;
const Product = db.product;
const OrderItem = db.orderItem;
const Order = db.order;
const Revenue = db.revenue;
const {Op} = require("sequelize");
const Yup = require("yup");


const creatOrder = async (req, res) => {
  try {
    const schema = Yup.object().shape({
      fullName: Yup.string().required(),
      address: Yup.string().required(),
      phone: Yup.string().required(),
      note: Yup.string().required(),
      paymentMethod: Yup.string()
        .oneOf(['cod', 'reshopPay', 'banking'])
        .required(),
      shippingCost: Yup.string().required(),
      status: Yup.string()
        .oneOf(['Đang xử lý', 'Đã giao', 'Đã hủy', 'Đang giao'])
        .required(),
      products: Yup.array()
        .of(
          Yup.object().shape({
            product_id: Yup.number().required(),
            price: Yup.string().required(),
            quantity: Yup.number().required(),
          })
        )
        .required(),
    });

    if (!(await schema.isValid(req.body))) {
      const errors = await schema
        .validate(req.body, { abortEarly: false })
        .catch((err) => err);
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
        message: 'User not found',
      });
    }

    const {
      fullName,
      address,
      phone,
      note,
      paymentMethod,
      products,
      shippingCost,
      status,
    } = req.body;
    // Calculate total price
    const totalPrice = products.reduce((acc, product) => {
      return acc + +product.price * +product.quantity;
    }, 0);


    const order = await Order.create({
      fullName,
      address,
      phone,
      note,
      shippingCost,
      totalPrice : totalPrice + +shippingCost,
      paymentMethod,
      user_id: userId,
      status,
    });

    const groupedProducts = products.reduce((acc, product) => {
      const existingProduct = acc.find((p) => p.product_id === product.product_id);
      if (existingProduct) {
        existingProduct.quantity += product.quantity;
        existingProduct.price = product.price;
      } else {
        acc.push({ ...product });
      }
      return acc;
    }, []);
    console.log(groupedProducts);

    // Process grouped products
    const created = [];
    for (const product of groupedProducts) {
      const item = await Product.findByPk(product.product_id);
      if (!item) {
        return res.status(404).json({
          statusCode: 404,
          message: `Product with ID ${product.product_id} not found`,
        });
      }
      if (item.quantity >= product.quantity) {
        item.quantity -= product.quantity;
        await item.save();
      } else {
        item.quantity = 0;
        await item.save();
      }
      const orderItem = await OrderItem.create({
        order_id: order.id,
        product_id: item.id,
        quantity: product.quantity,
        orderedPrice: product.price,
      });
      created.push(orderItem);
    }
    await Promise.all(created);
    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: order,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};


const updatePayMent = async (req, res) => {
  try {
    const schema = Yup.object().shape({
      order_id: Yup.number().required(),
      paymentMethod: Yup.string().oneOf(['cod', 'reshopPay', 'banking']).required(),
      isPaid: Yup.boolean().required(),
    });
    if (!(await schema.isValid(req.body))) {
      const errors = await schema.validate(req.body, {abortEarly: false}).catch(err => err);
      return res.status(400).json({
        statusCode: 400,
        message: errors.errors,
      });
    }
    const {order_id, paymentMethod, isPaid ,status} = req.body;
    const order = await Order.findByPk(order_id);
    if (!order) {
      return res.status(404).json({
        statusCode: 404,
        message: "Order not found",
      });
    }
    order.paymentMethod = paymentMethod;
    order.isPaid = isPaid;
    order.paidDate = new Date();
    await order.save();
    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: order,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
}

const updateStatus = async (req, res) => {
  try {
    const schema = Yup.object().shape({
      order_id: Yup.number().required(),
      status: Yup.string().oneOf(['Đang xử lý', 'Đang giao', 'Đã giao', 'Đã hủy']).required(),
    });
    if (!(await schema.isValid(req.body))) {
      const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
      return res.status(400).json({
        statusCode: 400,
        message: errors.errors,
      });
    }

    const { order_id, status } = req.body;
    const order = await Order.findByPk(order_id);

    if (!order) {
      return res.status(404).json({
        statusCode: 404,
        message: "Order not found",
      });
    }

    const currentStatus = order.status;

    // Định nghĩa thứ tự trạng thái
    const statusOrder = ['Đang xử lý', 'Đang giao', 'Đã giao'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextIndex = statusOrder.indexOf(status);

    if (status === 'Đã hủy') {
      // Cho phép chuyển sang "Đã hủy" từ "Đang xử lý" hoặc "Đã giao"
      if (currentStatus !== 'Đang xử lý' && currentStatus !== 'Đang giao') {
        return res.status(400).json({
          statusCode: 400,
          message: `Không thể cập nhật từ trạng thái "${currentStatus}" sang "Đã hủy"`,
        });
      }
    } else if (currentStatus === 'Đã hủy') {
      // Không cho phép cập nhật trạng thái từ "Đã hủy"
      return res.status(400).json({
        statusCode: 400,
        message: `Không thể cập nhật từ trạng thái "Đã hủy" sang "${status}"`,
      });
    } else {
      // Chỉ cho phép cập nhật lên trạng thái tiếp theo
      if (nextIndex !== currentIndex + 1) {
        return res.status(400).json({
          statusCode: 400,
          message: `Không thể cập nhật từ trạng thái "${currentStatus}" sang "${status}"`,
        });
      }
    }

    if(status === "Đã hủy"){
      const orderItems = await OrderItem.findAll({
        where: {
          order_id: order_id
        }
      });
      await Promise.all(orderItems.map(async (item) => {
        const product = await Product.findByPk(item.product_id);
        const sum = +product.quantity + +item.quantity;
        product.quantity = sum.toString();
        await product.save();
      }));
    }

    // Cập nhật trạng thái
    order.status = status;
    await order.save();

    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: order,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};


const getAllOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }

    const orders = await Order.findAll({
      where: { user_id: userId },
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              include: [
                {
                  model: Image,
                },
              ],
            },
          ],
        },
      ],
    });

    const datamap = await Promise.all(orders.map(async (order) => ({
      id: order.id,
      totalPrice: order.totalPrice,
      status: order.status,
      createdAt: order.createdAt,
      totalQuantity: order.orderItems.reduce((total, item) => total + item.quantity, 0),
      updatedAt: order.updatedAt,
      images: order.orderItems.map((item) => item.product.images[0].url),
    })));

    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: datamap,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const getStatusBuyProduct = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }

    const statuses = ['Đang xử lý', 'Đã giao', 'Đã hủy', 'Đang giao'];
  const orders = await Order.findAll({
      where: { user_id: userId },
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              where: {
                user_id: userId
              }
            },
          ],
        },
      ],
      attributes: ['status'],
    });
    const statusCounts = {
      'Đang xử lý': 0,
      'Đã giao': 0,
      'Đã hủy': 0,
      'Đang giao': 0,
    };
    console.log(JSON.stringify(orders, null, 2));

    orders.forEach(order => {
      const status = order.status;
      console.log(JSON.stringify(order.orderItems, null, 2));
      // const totalQuantity = order.orderItems.reduce((total, item) => total + item.quantity, 0);
      const totalQuantity = order.orderItems.reduce((total, item) => {
        return total + item.dataValues.quantity;
      }, 0);
      if (statuses.includes(status)) {
        statusCounts[status] += totalQuantity;
      }
    });
    console.log(statusCounts);
    return res.status(200).json({
      statusCode: 200,
      data: statusCounts
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const getOrderItemByUserId = async (req, res) => {
  try {
    const userId = req.userId;
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }

    const orderItems = await OrderItem.findAll({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: Product,
          where: {
            user_id: userId
          },
          include: [
            {
              model: Image,
            },
          ],
        },
      ],
    });

    const aggregatedData = orderItems.reduce((acc, item) => {
      const { product_id, orderedPrice, quantity, product } = item;
      const existingProduct = acc[product_id] || {
        orderedPrice: 0,
        quantity: 0,
        images: [],
        productId: product.id,
        title: product.title
      };

      existingProduct.orderedPrice += parseInt(orderedPrice);
      existingProduct.quantity += quantity;
      existingProduct.images = [...existingProduct.images, ...product.images];

      acc[product_id] = existingProduct;

      return acc;
    }, {});

    const result = Object.values(aggregatedData).map(product => ({
      productId: product.productId,
      title: product.title,
      totalOrderedPrice: product.orderedPrice,
      totalQuantity: product.quantity,
      images: product.images[0].url
    }));

    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: result
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};



const getDashBoardProduct = async (req, res) => {
  try {
    const userId = req.userId;
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const user = await User.findByPk(userId);

    const monthYear = year+month;

    const revenue = await Revenue.findOne({
      where: {
        dateReceipt: +monthYear
      }
    });
    let isReceipt = false;
    if(revenue){
      isReceipt = true;
    }

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }

    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: Product,
          where: {
            user_id: userId
          },
          include: [
            {
              model: Image,
            },
          ],
        },
        {
          model: Order,
          where:{
            status: 'Đã giao'
          }
        }
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      }
    });

    const aggregatedData = orderItems.reduce((acc, item) => {
      const { product_id, orderedPrice, quantity, product } = item;
      const existingProduct = acc[product_id] || {
        orderedPrice: 0,
        quantity: 0,
        images: [],
        productId: product.id,
        title: product.title
      };

      existingProduct.orderedPrice += parseInt(orderedPrice);
      existingProduct.quantity += quantity;
      existingProduct.images = [...existingProduct.images, ...product.images];

      acc[product_id] = existingProduct;

      return acc;
    }, {});

    const result = Object.values(aggregatedData).map(product => ({
      totalOrderedPrice: product.orderedPrice,
      totalQuantity: product.quantity,
    }));

    const totals = result.reduce((acc, item) => {
  acc.totalQuantity += item.totalQuantity;
  acc.totalOrderedPrice += item.totalOrderedPrice;
  return acc;
}, { totalQuantity: 0, totalOrderedPrice: 0 });


    const rs = {
      totalQuantity: totals.totalQuantity,
      totalOrderedPrice: Math.ceil(totals.totalOrderedPrice * 0.97 * 100) / 100
    }
    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: rs,isReceipt
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const getOrderStatusSale = async (req, res) => {
  try {
    const userId = req.userId;
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }

    const orderItems = await OrderItem.findAll({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: Product,
          where: {
            user_id: userId
          },
          include: [
            {
              model: Image,
            },
          ],
        },
        {
          model: Order,
        },
      ],
    });

    const statuses = ['Đang xử lý', 'Đã giao', 'Đã hủy', 'Đang giao'];
    const statusCounts = {
      'Đang xử lý': 0,
      'Đã giao': 0,
      'Đã hủy': 0,
      'Đang giao': 0,
    };

    orderItems.forEach(orderItem => {
      const status = orderItem.order.status;
      const totalQuantity = orderItem.quantity;
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status] += totalQuantity;
      }
    });

    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: statusCounts
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);
    const orderId = req.params.id;
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              include: [
                {
                  model: Image,
                },
              ],
            },
          ],
        },
      ],
    });
    if (!order) {
      return res.status(404).json({
        statusCode: 404,
        message: "Order not found",
      });
    }
    const mappedData = {
      id: order.id,
      fullName: order.fullName,
      address: order.address,
      phone: order.phone,
      note: order.note,
      shippingCost: order.shippingCost,
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      isPaid: order.isPaid,
      paidDate: order.paidDate,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user_id: order.user_id,
      items: order.orderItems.map(item => ({
        id: item.id,
        title: item.product.title,
        orderedPrice: item.orderedPrice,
        quantity: item.quantity,
        url: item.product.images[0].url,
      }))
    };
    return res.status(200).json({
      statusCode: 200,
      message: "OK",
      data: mappedData,
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
  creatOrder,
  updatePayMent,
  getAllOrder,
  updateStatus,
  getStatusBuyProduct,
  getOrderItemByUserId,
  getDashBoardProduct,
  getOrderStatusSale,
  getOrderById
}