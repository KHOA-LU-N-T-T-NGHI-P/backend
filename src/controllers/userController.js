
const db = require('../models');
const User = db.user;
const Image = db.image;
const Category = db.category;
const Product = db.product;
const Address = db.address;
const {Op} = require("sequelize");
const Yup = require("yup");
const Order = db.order;
const OrderItem = db.orderItem;
const {deleteDocument} = require("../controllers/elasticController");

const updateCategory = async (req, res) => {
    try{
        const name = ["Thời trang và phụ kiện","Đồ dùng cho sự kiện","Đồ dùng gia đình","Đồ dùng học tập","Đồ dùng trẻ em","Phương tiện di chuyển","Bất động sản","Khác"]
        const created = name.map(async (name) => {
              return Category.create({
                  name: name,
              });
          }
        );
        await Promise.all(created);
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
        });

    }catch(e){
        return res.status(500).json({
        })
    }

}

const getAllCategory = async (req, res) => {
    try{
        const category = await Category.findAll();
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: category,
        });
    }catch(e){
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}


const createProduct = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            price: Yup.string().required(),
            title: Yup.string().required(),
            description: Yup.string().required(),
            statusItem: Yup.string().required(),
            quantity: Yup.number().required(),
            category_id: Yup.number().required(),
            address: Yup.string().required(),
            images: Yup.array().of(
              Yup.object().shape({
                  url: Yup.string().required(),
              })
            ).required(),
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
        if (!user || userId !== user.id) {
            return res.status(400).json({
                statusCode: 400,
                message: "User does not exist",
            });
        }
        const user_id = user.id;
        const {
            price,
            title,
            description,
            statusItem,
            quantity,
            category_id,
            images,
            address,
        } = req.body;
        const product = await Product.create({
            price,
            title,
            description,
            statusItem,
            quantity,
            category_id,
            address,
            user_id,
        });
        const length = images.length;
        for (let i = 0; i < length; i += 2) {
            const batch = images.slice(i, i + 2);
            const created = batch.map(image => {
                return Image.create({
                    url: image.url,
                    product_id: product.id,
                });
            });
            await Promise.all(created);
        }
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: product,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};

const updateProduct = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            price: Yup.string().required(),
            title: Yup.string().required(),
            description: Yup.string().required(),
            statusItem: Yup.string().required(),
            quantity: Yup.number().required(),
            address: Yup.string().required(),
            category_id: Yup.number().required(),
            images: Yup.array().of(
              Yup.object().shape({
                  url: Yup.string().required(),
              })
            ).required(),
        });
        if (!(await schema.isValid(req.body))) {
            const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
            return res.status(400).json({
                statusCode: 400,
                message: errors.errors,
            });
        }
        const userId = req.userId;
        const product_id = Number(req.params.id);
        const {
            price,
            title,
            description,
            statusItem,
            quantity,
            address,
            category_id,
            images,
        } = req.body;
        const product = await  Product.findOne({
            where: {
                id: product_id,
                user_id: userId,
            },
        });
        if (!product) {
            return res.status(404).json({
                statusCode: 404,
                message: "Product not found",
            });
        }
        const imageProduct = await Image.findAll({
            where: {
                product_id: product_id,
            },
        });

        await Promise.all(imageProduct.map(image => image.destroy()));
        const length = images.length;
        for (let i = 0; i < length; i += 2) {
            const batch = images.slice(i, i + 2);
            const created = batch.map(image => {
                return Image.create({
                    url: image.url,
                    product_id: product_id,
                });
            });
            await Promise.all(created);
        }
        product.price = price;
        product.title = title;
        product.description = description;
        product.statusItem = statusItem;
        product.quantity = quantity;
        product.category_id = category_id;
        product.address = address;
        await product.save();
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: product,
        });
    } catch (e) {
        console.error(e); // Log the error for debugging
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}

const getProductByUser = async (req, res) => {
    try {
        const userId = req.userId;
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
            where: {
                user_id: userId,
                status:true,
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
            where: {
                user_id: userId,
                status:true,
            },
        });
        const [count, products] = await Promise.all([countPromise, productPromise]);
        if (products.length === 0) {
            return res.status(404).json({
                statusCode: 404,
                message: "Post not found",
            });
        }
        const results = products.map(product => ({
            id: product.id || 0,
            statusItem: product?.statusItem||"",
            price: product?.price||"",
            title: product?.title||"",
            user_id: product?.user_id||"",
            image: product?.images[0]?.url||"",
            category: product?.category?.name||"",
            isVisible: product?.isVisible||"",
            quantity: product?.quantity||"",
            address: product?.address||"",
            createAt: product?.createdAt||"",
            updatedAt: product?.updatedAt
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

const getProductByCategory = async (req, res) => {
    try {
        const category_id = req.params.id;
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
            where: {
                category_id: category_id,
                status: true,
                isVisible:true,
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
            where: {
                category_id: category_id,
                status: true,
                isVisible:true,
            },
        });
        const [count, products] = await Promise.all([countPromise, productPromise]);
        if (products.length === 0) {
            return res.status(404).json({
                statusCode: 404,
                message: "Post not found",
            });
        }
        const results = products.map(product => ({
            id: product.id || 0,
            statusItem: product?.statusItem||"",
            price: product?.price||"",
            title: product?.title||"",
            image: product?.images[0]?.url||"",
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
                isVisible:true
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
            where: {
                status: true,
                isVisible:true
            },
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
                {
                    model: User,
                    attributes: ["fullName", "avatar"],
                }
            ],
        });
        const productOrder = await OrderItem.findAll({
            where: {
                product_id: product_id,
            },
            include: [
                {
                    model: Order,
                    where:{
                        status: 'Đã giao'
                    }
                }
            ],
        });
        const total = productOrder.reduce((total, order) => total + order.quantity, 0);
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
            user_id: product.user_id,
            category: product.category.name,
            fullName: product.user.fullName,
            totalSale : total,
            avatar: product.user.avatar,
            email: product.user.email,
            phone: product.user.phone,
            address: product.address,
            quantity: +product.quantity,
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

const getCategory =async  (req, res) => {
    try {
        const category = await Category.findAll();
        if(category.length === 0){
            return res.status(404).json({
                statusCode: 404,
                message: "Category not found",
            });
        }
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: category,
        });


    }catch(e){
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });

    }
}

const deleteProduct = async (req, res) => {
    try {
        const userId = req.userId;
        const product_id = req.params.id;
        const product = await Product.findOne({
            where: {
                id: product_id,
                user_id: userId,
            },
        });
        if (!product) {
            return res.status(404).json({
                statusCode: 404,
                message: "Post not found",
            });
        }
        product.status = false;
        await product.save();
        await deleteDocument(product.id);
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

const getInforById = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
        }
        const results={
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            birthday: user.birthday,
            role: user.role,
            bankAccount : user.bankAccount,
            bankName : user.bankName,
            gender:user.gender,
            avatar: user.avatar,
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

const updateInformation = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
        }

        const updatedData = req.body; // Assuming the updated fields are in req.body
        await User.update(updatedData, {
            where: { id: userId },
        });

        const updatedUser = await User.findByPk(userId); // Refetch to get the latest data
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

const createAddress = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            nameAddress: Yup.string().required(),
            userName: Yup.string().required(),
            phone: Yup.string().required(),
            addressUser: Yup.string().required(),
        });
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
        }
        if (!(await schema.isValid(req.body))) {
            const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
            return res.status(400).json({
                statusCode: 400,
                message: errors.errors,
            });
        }
        const {nameAddress, userName, phone, addressUser} = req.body;
        const address = await Address.create({
            nameAddress,
            userName,
            phone,
            addressUser,
            user_id: userId,
        });
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: address,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}

const updateAddress = async (req, res) => {
    try {
        const userId = req.userId;
        const addressId = req.params.id;
        const address = await Address.findOne({
            where: {
                id: addressId,
                user_id: userId,
            },
        });
        if (!address) {
            return res.status(404).json({
                statusCode: 404,
                message: "Address not found",
            });
        }
        const updatedData = req.body;
        await Address.update(updatedData, {
            where: { id: addressId },
        });
        const updatedAddress = await Address.findByPk(addressId); // Refetch to get the latest data
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: updatedAddress,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}

const deleteAddress = async (req, res) => {
    try {
        const userId = req.userId;
        const addressId = req.params.id;
        const address = await Address.findOne({
            where: {
                id: addressId,
                user_id: userId,
            },
        });
        if (!address) {
            return res.status(404).json({
                statusCode: 404,
                message: "Address not found",
            });
        }
        await address.destroy();
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

const getAddress = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
        }
        const address = await Address.findAll({
            where: {
                user_id: userId,
            },
        });
        if (address.length === 0) {
            return res.status(404).json({
                statusCode: 404,
                message: "Address not found",
            });
        }
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data: address,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
}

const createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        // Validate that the name is provided
        if (!name) {
            return res.status(400).json({
                statusCode: 400,
                message: "Category name is required",
            });
        }

        // Create the new category
        const newCategory = await Category.create({ name });

        // Send response with the created category
        return res.status(201).json({
            statusCode: 201,
            message: "Category created successfully",
            data: newCategory,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};

const requestSale = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
        }
        user.requestSale = true;
        await user.save();
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


module.exports ={
    createProduct,
    getProductByUser,
    getProductAll,
    getProductById,
    getProductByCategory,
    getCategory,
    deleteProduct,
    updateProduct,
    updateCategory,
    getAllCategory,
    getInforById,
    updateInformation,
    createAddress,
    updateAddress,
    deleteAddress,
    getAddress,
    createCategory,
    requestSale
}