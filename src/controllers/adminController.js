
const db = require('../models');
const User = db.user;
const Product = db.product;
const {Op, where} = require("sequelize");
const Image = db.image;
const Category = db.category;
const Cart = db.cart;
const Address = db.address;
const Revenue = db.revenue;
const OrderItem = db.orderItem;
const Order = db.order;
const Yup = require("yup");
const sendMail = require("../middlerwares/sendMail");
const {deleteDocument} = require("../controllers/elasticController");



const registerDev = async (req, res) => {
        try {
            const schema = Yup.object().shape({
                fullName: Yup.string().required(),
                email: Yup.string().email().required(),
                password: Yup.string().required().min(8, 'Password must be at least 8 characters long'),
                birthday: Yup.string().required(),
                phone: Yup.string().required().length(10),
            });
            if (!(await schema.isValid(req.body))) {
                const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
                return res.status(400).json({
                    statusCode: 400,
                    message: errors.errors,
                });
            }
            let {fullName, email, password, birthday, phone} = req.body;
            const user = await User.findOne({
                where: {
                    email: email,
                },
            });
            if (user) {
                return res.status(400).json({
                    statusCode: 400,
                    message: "Email already exists",
                });
            }
            const newUser = await User.create({
                fullName, email, password, birthday, phone, role: "admin"
            });
            const cart = await Cart.create({
                user_id: newUser.id,
            });
            await newUser.save();
            const {password: hashedPassword, ...userData} = newUser.get();
            return res.status(200).json({
                statusCode: 200,
                message: "OK",
                data : userData,
            });
        }catch (e) {
            console.log(e)
            return res.status(500).json({
                statusCode: 500,
                message: 'Internal Server Error',
            });
        }
    }





const updateSale = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            id: Yup.number().required(),
        });
        if (!(await schema.isValid(req.param))) {
            return res.status(400).json({error: "Validation fails"});
        }
        const {id} = req.query;
        const sale = await User.findOne({
            where: {
                id: id,
                status: true,
            }
        });
        if (!sale) {
            return res.status(400).json({error: "User not found"});
        }
        sale.role = "sale";
        sale.updatedAt = new Date();
        await sale.save();
        return res.status(200).json({message: "Sale updated successfully"});
    }catch (e) {
        return res.status(500).json({error: e.message});
    }
}

const updateStatusProduct = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            id: Yup.number().required(),
            status: Yup.boolean().required(),
        });
        if (!(await schema.isValid(req.body))) {
            return res.status(400).json({error: "Validation fails"});
        }
        const {id ,status} = req.body;
            const product = await Product.findOne({
                where: {
                    id: id,
                }
            });
            if (!product) {
                return res.status(400).json({error: "Product not found"});
            }
            product.status = status;
            product.updatedAt = new Date();
            if(status === false){
                await deleteDocument(product.id);
            }
            await product.save();
            return res.status(200).json({message: "Product update successfully"});

    }catch (e) {
        return res.status(500).json({error: e.message});
    }
}
const updateIsVisibleProduct = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            id: Yup.number().required(),
            isVisible: Yup.boolean().required(),
        });
        if (!(await schema.isValid(req.body))) {
            return res.status(400).json({error: "Validation fails"});
        }
        const {id ,isVisible} = req.body;
        const product = await Product.findOne({
            where: {
                id: id,
            }
        });
        if (!product) {
            return res.status(400).json({error: "Product not found"});
        }
        product.isVisible = isVisible;
        product.dateVisible = new Date();
        await product.save();
        return res.status(200).json({message: "Product update successfully"});

    }catch (e) {
        return res.status(500).json({error: e.message});
    }
}

const updateStatusUser = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            id: Yup.number().required(),
            status : Yup.boolean().required(),
        });
        if (!(await schema.isValid(req.param))) {
            return res.status(400).json({error: "Validation fails"});
        }
        const {id,status} = req.body;
        const user = await User.findOne({
            where: {
                id: id,
            }
        });
        if (!user) {
            return res.status(400).json({error: "User not found"});
        }
        user.status = status;
        await user.save();
        return res.status(200).json({message: "User update successfully"});
    }catch (e) {
        return res.status(500).json({error: e.message});
    }
}
const getProductAll = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            limit: Yup.number().required(),
            page: Yup.number().required(),
        });
        if(!(await schema.isValid(req.query))){
            const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
            return res.status(400).json({
                statusCode: 400,
                message: errors.errors,
            });
        }
        const {limit , page} =  req.query;
        const offset = (page - 1) * limit;
        const productPromise =  Product.findAll({
            where : {
                status: true,
            },
            include: [
                {
                    model: Category,
                },
                {
                    model: Image,
                    as: "images",
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit, 10),
            offset: parseInt(offset,10),
        });
        const countPromise =  Product.count({
            where : {
                status: true,
            }
        });
        const [count, products] = await Promise.all([countPromise, productPromise]);
        if (products.length === 0) {
            return res.status(404).json({
                statusCode: 404,
                message: "Product not found",
            });
        }
        const results = products.map(product => ({
            id: product.id || 0,
            statusItem: product?.statusItem||"",
            price: product?.price||"",
            title: product?.title||"",
            image: product?.images[0]?.url||"",
            quantity: product?.quantity || "",
            status: product?.status || "",
            isVisible: product?.isVisible || "",
            address: product?.address||"",
            category: product?.category?.name||"",
            createAt: product?.createdAt||""
        }));
        const totalPages = Math.ceil(count / limit);
        const total = count;
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: results,totalPages,total
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}

const getProductById = async (req, res) => {
    try {
        const product_id = req.params.id;
        const product = await Product.findByPk(product_id, {
            include: [
                {
                    model: Category,
                    as: "category",
                    attributes: ["name"],
                },
                {
                    model: Image,
                },
            ],
        });
        if (!product) {
            return res.status(404).json({
                statusCode: 404,
                message: "Product not found",
            });
        }
        const results = {
            id: product.id,
            statusItem: product.statusItem,
            price: product.price,
            title: product.title,
            description: product.description,
            images: product.images,
            status: product.status,
            isVisible: product.isVisible,
            category: product.category.name,
            address: product.address,
            quantity: product.quantity,
            updatedAt: product.updatedAt,
            category_id: product.category_id
        }
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: results,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}

const getUserAll = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            limit: Yup.number().required(),
            page: Yup.number().required(),
        });
        if(!(await schema.isValid(req.query))){
            const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
            return res.status(400).json({
                statusCode: 400,
                message: errors.errors,
            });
        }
        const {limit , page} =  req.query;
        const offset = (page - 1) * limit;
        const userPromise =  User.findAll({
            where : {
                role: {
                    [Op.not]: "admin"
                }

            },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit, 10),
            offset: parseInt(offset,10),
        });
        const countPromise =  User.count({
            where : {
                role: {
                    [Op.not]: "admin"
                }
            }
        });
        const [count, users] = await Promise.all([countPromise, userPromise]);
        if (users.length === 0) {
            return res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
        }
        const results = users.map(user => ({
            id: user.id || 0,
            email: user?.email || "",
            phone: user?.phone || "",
            role: user?.role || "",
            status: user?.status || "",
            createAt: user?.createdAt || ""
        }));
        const totalPages = Math.ceil(count / limit);
        const total = count;
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: results,totalPages,total
        });
    }catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}

const getUserById = async (req, res) => {
    try {
        const user_id = req.params.id;
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
        }
        const results = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            requestSale: user.requestSale,
            bankAccount : user.bankAccount,
            bankName : user.bankName,
            avatar: user.avatar,
            birthday: user.birthday,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,

        }
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: results,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}

const getDashBoard = async (req, res) => {
    try {
        const month = parseInt(req.query.month, 10);
        const year = parseInt(req.query.year, 10);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);

        const totalProduct = await Product.count({
            where: {
                status: true,
                createdAt: {
                    [Op.between]: [start, end],
                }
            }
        });

        const totalUser = await User.count({
            where: {
                role: {
                    [Op.not]: "admin"
                },
                createdAt: {
                    [Op.between]: [start, end],
                }
            }
        });

        const totalSale = await User.count({
            where: {
                role: "sale",
                createdAt: {
                    [Op.between]: [start, end],
                }
            }
        });

        const totalOrder = await Order.count({
            where: {
                createdAt: {
                    [Op.between]: [start, end],
                }
            }
        });

        const totalRevenue = await Order.sum("totalPrice", {
            where: {
                createdAt: {
                    [Op.between]: [start, end],
                }
            }
        });

        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: {
                totalProduct,
                totalUser,
                totalSale,
                totalOrder,
                totalRevenue
            }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};


const topTenProductSale = async (req, res) => {
    try {
        const month = parseInt(req.query.month, 10);
        const year = parseInt(req.query.year, 10);
        const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const end = new Date(year, month, 0).toISOString().slice(0, 10);

        const products = await OrderItem.findAll({
            attributes: [
                "product_id",
                [db.sequelize.fn("SUM", db.sequelize.col("quantity")), "totalQuantity"],
            ],
            where: {
                createdAt: {
                    [Op.between]: [start, end],
                }
            },
            group: ["product_id"],
            order: [[db.sequelize.literal("totalQuantity"), "DESC"]],
            limit: 10,
        });

        const dataRs = await Promise.all(products.map(async (product) => {
            const productInfo = await Product.findByPk(product.product_id, {
                include: [
                    {
                        model: Image,
                    },
                ],
            });
            return {
                id: productInfo.id,
                title: productInfo.title,
                totalQuantity: product.dataValues.totalQuantity,
                image: productInfo.images.length > 0 ? productInfo.images[0].url : null,
            };
        }));

        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: dataRs,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};




const topTenUser = async (req, res) => {
    try {
        const month = parseInt(req.query.month, 10);
        const year = parseInt(req.query.year, 10);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);

        const users = await User.findAll({
            where: {
                role: {
                    [Op.not]: "admin",
                },
            },
            attributes: {
                include: [
                    [db.sequelize.literal(`(
                        SELECT SUM(orders.totalPrice)
                        FROM orders
                        WHERE orders.user_id = user.id AND orders.createdAt BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'
                    )`), 'totalPrice'],
                    [db.sequelize.literal(`(
                        SELECT SUM(orderItems.quantity)
                        FROM orders
                        JOIN orderItems ON orders.id = orderItems.order_id
                        WHERE orders.user_id = user.id AND orders.createdAt BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'
                    )`), 'totalQuantity']
                ]
            },
            order: [[db.sequelize.literal('totalPrice'), 'DESC']],
            limit: 10,
        });

        const results = users.map((user) => ({
            id: user.id,
            fullName: user.fullName,
            totalPrice: user.dataValues.totalPrice || 0,
            totalQuantity: user.dataValues.totalQuantity || 0,
        }));

        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: results,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};
const getAllDashBoardProduct = async (req, res) => {
    try {
        const userId = req.query.id;
        console.log("userId", userId);
        const user = await User.findByPk(userId);
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
                        user_id: userId,
                    },
                    include: [
                        {
                            model: Image,
                        },
                    ],
                },
                {
                    model: Order,
                    where: {
                        status: 'Đã giao',
                    },
                },
            ],
        });

        const mapData = orderItems.map((orderItem) => ({
            id: orderItem.id,
            quantity: orderItem.quantity,
            orderedPrice: orderItem.orderedPrice,
            createdAt: orderItem.createdAt,
        }));

        const groupByMonthAndSum = mapData.reduce((acc, orderItem) => {
            const month = new Date(orderItem.createdAt).toISOString().slice(0, 7); // lấy phần "YYYY-MM"

            if (!acc[month]) {
                acc[month] = {
                    totalOrderedPrice: 0,
                    totalQuantity: 0,
                };
            }
            acc[month].totalOrderedPrice += parseFloat(orderItem.orderedPrice);
            acc[month].totalQuantity += orderItem.quantity;

            return acc;
        }, {});

        const mapData2 = Object.keys(groupByMonthAndSum).map((key) => ({
            month: key.replace('-', ''),
            totalOrderedPrice: groupByMonthAndSum[key].totalOrderedPrice,
            totalQuantity: groupByMonthAndSum[key].totalQuantity,
        }));

        const mapDataRs = await Promise.all(
          mapData2.map(async (orderItem) => {
              const isReceipt = await Revenue.findOne({
                  where: {
                      dateReceipt: +orderItem.month,
                  },
              });
              const formattedDate = `${orderItem.month.slice(0, 4)}-${orderItem.month.slice(4)}`;
              const check = isReceipt ? true : false;
              return {
                  totalOrderedPrice: orderItem.totalOrderedPrice,
                  totalQuantity: orderItem.totalQuantity,
                  isReceipt: check,
                  dateReceipt: formattedDate,
              };
          })
        );

        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: mapDataRs,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};


const payForUser = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            id: Yup.number().required(),
            month: Yup.string().required(),
            year: Yup.string().required(),
        });
        if (!(await schema.isValid(req.query))) {
            return res.status(400).json({error: "Validation fails"});
        }
        const id = req.query.id;
        console.log("id",id)
        const user = await User.findOne({
            where: {
                id: id,
                status: true,
                role: "sale"
            }
        });
        const date = year + month;
        const revenue = await Revenue.create({
            user_id:user.id,
            isPaid: true,
            dateReceipt: +date,
        });
        return res.status(200).json({message: "Revenue updated successfully"});
    }catch (e) {
        return res.status(500).json({error: e.message});
    }
}

const getAllOrder = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            limit: Yup.number().required(),
            page: Yup.number().required(),
        });
        if(!(await schema.isValid(req.query))){
            const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
            return res.status(400).json({
                statusCode: 400,
                message: errors.errors,
            });
        }
        const {limit , page} =  req.query;
        const offset = (page - 1) * limit;
        const orders = await Order.findAll({
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
            order: [["updatedAt", "DESC"]],
            limit: parseInt(limit, 10),
            offset: parseInt(offset,10),
        });
        const datamap = await Promise.all(orders.map(async (order) => ({
            id: order.id,
            totalPrice: order.totalPrice,
            status: order.status,
            createdAt: order.createdAt,
            isPaid: order.isPaid,
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

module.exports = {
    updateSale,
    updateStatusProduct,
    updateStatusUser,
    getProductById,
    getProductAll,
    getUserAll,
    getUserById,
    registerDev,
    topTenUser,
    topTenProductSale,
    getDashBoard,
    getAllDashBoardProduct,
    payForUser,
    getAllOrder,
    updateIsVisibleProduct

}