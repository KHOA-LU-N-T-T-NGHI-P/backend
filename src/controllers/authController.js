const db = require('../models');
const User = db.user;
const Cart = db.cart;
const {Op} = require("sequelize");
const Yup = require('yup');
const JwtService = require("../services/jwtServices.js");
const sendMail = require('../middlerwares/sendMail.js')



const login = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            email: Yup.string().email().required(),
            password: Yup.string().required(),
        });
        let {email, password} = req.body;
        if (!(await schema.isValid(req.body))) {
            const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
            return res.status(400).json({
                statusCode: 400,
                message: errors.errors,
            });
        }

        const user = await User.findOne({
            where: {
                email: email,
            },
        });
        if (!user) {
            return res.status(400).json({
                statusCode: 400,
                message: "User does not exist",
            });
        }
        if(user.status === false){
            return res.status(403).json({
                statusCode: 403,
                message: "Account has been locked",
            });
        }
        const isPasswordValid = await user.checkPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                statusCode: 401,
                message: "Password is incorrect",
            });
        }
        const issuedAt = new Date().getTime()/1000;
        const  accessToken = JwtService.jwtSign({userId: user.id,issuedAt: issuedAt,token:1}, {expiresIn: "5h"});
        const  refreshToken = JwtService.jwtSign({userId: user.id,issuedAt:issuedAt,token:2}, {expiresIn: "7d"});
        const {password: hashedPassword, ...userData} = user.get();
        const resBody = {
            accessToken,
            userData,
            refreshToken
        };
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data :resBody,
        });
    } catch (e) {
        return res.status(500).json({
            statusCode: 500,
            message: 'Internal Server Error',
        });
    }
};

const register = async (req, res) => {
    console.log("register")
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
            fullName, email, password, birthday, phone
        });
        const cart = await Cart.create({
            user_id: newUser.id,
        });
        await newUser.save();
        const html = `Chào mừng bạn đến với NEU SHOP`;
        const text = {
            email,
            html
        }
        const rs = await sendMail(text)
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

const refreshToken = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            refreshToken: Yup.string().required(),
        });
        if(!(await schema.isValid(req.body))){
            const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
            return res.status(400).json({
                statusCode: 400,
                message: errors.errors,
            });
        }
        const {refreshToken} = req.body;
        const decoded = JwtService.jwtVerify(refreshToken);
        if(decoded.token !== 2){
            return res.status(401).json({
                statusCode: 401,
                message: "Invalid token",
            });
        }
        const user = await User.findByPk(decoded.userId);
        const issuedAt = new Date().getTime()/1000;
        const  accessToken = JwtService.jwtSign({userId: user.id,issuedAt: issuedAt,token:1}, {expiresIn: "5h"});
        const  refreshToken2 = JwtService.jwtSign({userId: user.id,issuedAt:issuedAt,token:2}, {expiresIn: "7d"});
        const {password: hashedPassword, ...userData} = user.get();
        const resBody = {
            accessToken,
            userData,
            refreshToken: refreshToken2
        };
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
            data :resBody,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: 'Internal Server Error',
        });
    }
}

const changePassword = async (req, res) => {
    try {
        const schema = Yup.object().shape({
            oldPassword: Yup.string().required(),
            newPassword: Yup.string().required().min(8, 'Password must be at least 8 characters long'),
        });
        if (!(await schema.isValid(req.body))) {
            const errors = await schema.validate(req.body, { abortEarly: false }).catch(err => err);
            return res.status(400).json({
                statusCode: 400,
                message: errors.errors,
            });
        }
        const {oldPassword, newPassword} = req.body;
        console.log(req.userId)
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
        }
        const isPasswordValid = await user.checkPassword(oldPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                statusCode: 401,
                message: "Old password is incorrect",
            });
        }
        user.password = newPassword;
        await user.save();
        return res.status(200).json({
            statusCode: 200,
            message: "OK",
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            statusCode: 500,
            message: 'Internal Server Error',
        });
    }
}

module.exports = {
    login,
    register,
    changePassword
}
