

module.exports= (sequelize, DataTypes) => {
  const Product = sequelize.define('product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    statusItem :{
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    price:{
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    title :{
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    description:{
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    status: {
      type: DataTypes.BOOLEAN, defaultValue: true
    },
    isVisible: {
      type: DataTypes.BOOLEAN, defaultValue: false
    },
    dateVisible: {
      type: DataTypes.DATE,
      allowNull: true
    },
    address :{
      type: DataTypes.STRING(255),
      allowNull: false
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
    timestamps: false
  });
  return Product;
}