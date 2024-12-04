const bcrypt = require('bcrypt');


module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("user", {
        id: {
            type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true
        },
        fullName: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        password: {
            type: DataTypes.STRING(255), set(value) {
                const saltRounds = 10;
                const hashedPassword = bcrypt.hashSync(value, saltRounds);
                this.setDataValue('password', hashedPassword);
            }

        },
        birthday :{
            type: DataTypes.STRING(100), allowNull: true
        },
        phone: {
            type: DataTypes.STRING(100), allowNull: true
        },
        status: {
            type: DataTypes.BOOLEAN, defaultValue: true
        },
        role: {
            type: DataTypes.STRING(100), defaultValue: 'user',validate:{
                isIn: [['user', 'admin','sale']]
            }
        },
        requestSale :{
            type: DataTypes.BOOLEAN, defaultValue: false
        },
        gender: {
            type: DataTypes.INTEGER,   allowNull: true
        },
        timeChangePassWord : {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        },
        avatar: {
            type: DataTypes.STRING(255),  allowNull: true
        },
        bankAccount :{
            type: DataTypes.STRING(255),
            allowNull: true
        },
        bankName :{
            type: DataTypes.STRING(255),
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            onUpdate: sequelize.literal('CURRENT_TIMESTAMP')
        },

    }, {
        timestamps: false,

    });
    User.prototype.checkPassword = async function (newPassword) {
        try {
            const check = await bcrypt.compare(newPassword, this.password);
            return check;
        } catch (error) {
            console.log(error);
        }
    }
    return User
}

