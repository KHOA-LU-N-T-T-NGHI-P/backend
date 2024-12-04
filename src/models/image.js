module.exports = (sequelize, DataTypes) => {
    const Image = sequelize.define('image', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        url :{
            type: DataTypes.STRING(255),
            allowNull: false
        },
    }, {
        timestamps: false
    });
    return Image;
}
