const db = require('../models');
const JwtService = require("../services/jwtServices.js");
const { BadTokenError } = require("../utils/apiError.js");
const User = db.user;

const authMiddleware = async (req, res, next) => {
    try {
        if (process.env.SERVER_JWT === "false") return next();
        const token = JwtService.jwtGetToken(req);
        const decoded = JwtService.jwtVerify(token);
        const user = await User.findByPk(decoded.userId);
        const time = new Date(user.timeChangePassWord).getTime()/1000;
        if(user.status === false || time > decoded.issuedAt){
            return res.status(403).json({
                statusCode: 403,
                message: "Account has been locked",
            });
        }
        req.userId = decoded.userId;
        return next();
    } catch (error) {
        next(new BadTokenError())
    }
}
const isAmin = async (req, res, next) => {
    try {
        if (process.env.SERVER_JWT === "false") return next();
        const token = JwtService.jwtGetToken(req);
        const decoded = JwtService.jwtVerify(token);
        const user = await User.findByPk(decoded.userId);
        const time = new Date(user.timeChangePassWord).getTime()/1000;
        if(user.status === false || time > decoded.issuedAt){
            return res.status(403).json({
                statusCode: 403,
                message: "Account has been locked",
            });
        }
        if(user.role !== "admin"){
            return res.status(403).json({
                statusCode: 403,
                message: "You do not have permission to access this page",
            });
        }
        req.userId = decoded.userId;
        return next();
    } catch (error) {
        next(new BadTokenError())
    }
}

const isSale = async (req, res, next) => {
    try {
        if (process.env.SERVER_JWT === "false") return next();
        const token = JwtService.jwtGetToken(req);
        const decoded = JwtService.jwtVerify(token);
        const user = await User.findByPk(decoded.userId);
        const time = new Date(user.timeChangePassWord).getTime()/1000;
        if(user.status === false || time > decoded.issuedAt){
            return res.status(403).json({
                statusCode: 403,
                message: "Account has been locked",
            });
        }
        if(user.role === "user"){
            return res.status(403).json({
                statusCode: 403,
                message: "You do not have permission to access this page",
            });
        }
        req.userId = decoded.userId;
        return next();
    } catch (error) {
        next(new BadTokenError())
    }
}

module.exports = {
    authMiddleware,
    isAmin,
    isSale
}
