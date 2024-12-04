const dbConfig = require('../config/dbConfig.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  dbConfig.DB,
  dbConfig.USER,
  dbConfig.PASSWORD,
  {
    host: dbConfig.HOST,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false,
    pool: {
      max: dbConfig.pool.max,
      min: dbConfig.pool.min,
      acquire: dbConfig.pool.acquire,
      idle: dbConfig.pool.idle
    }
  }
);

sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.sequelize.sync({ alter: true })
  .then(() => {
    console.log('yes re-sync done!');
  });

db.user = require('./user.js')(sequelize, DataTypes);
db.category = require('./category.js')(sequelize, DataTypes);
db.product = require('./product.js')(sequelize, DataTypes);
db.image = require('./image.js')(sequelize, DataTypes);
db.cart = require('./cart.js')(sequelize, DataTypes);
db.cartItem = require('./cartItem.js')(sequelize, DataTypes);
db.order = require('./order.js')(sequelize, DataTypes);
db.orderItem = require('./orderItem.js')(sequelize, DataTypes);
db.address = require('./address.js')(sequelize, DataTypes);
db.revenue = require('./revenue.js')(sequelize, DataTypes);

// Relations
db.user.hasMany(db.address, { foreignKey: 'user_id', onUpdate: 'cascade', onDelete: 'cascade' });
db.address.belongsTo(db.user, { foreignKey: 'user_id', onUpdate: 'cascade', onDelete: 'cascade' });

db.category.hasMany(db.product, { foreignKey: 'category_id', onUpdate: 'cascade', onDelete: 'cascade' });
db.product.belongsTo(db.category, { foreignKey: 'category_id', onUpdate: 'cascade', onDelete: 'cascade' });

db.user.hasMany(db.product, { foreignKey: 'user_id', onUpdate: 'cascade', onDelete: 'cascade' });
db.product.belongsTo(db.user, { foreignKey: 'user_id', onUpdate: 'cascade', onDelete: 'cascade' });

db.product.hasMany(db.image, { foreignKey: 'product_id', onUpdate: 'cascade', onDelete: 'cascade' });
db.image.belongsTo(db.product, { foreignKey: 'product_id', onUpdate: 'cascade', onDelete: 'cascade' });

db.user.hasMany(db.order, { foreignKey: 'user_id', onUpdate: 'cascade', onDelete: 'cascade' });
db.order.belongsTo(db.user, { foreignKey: 'user_id', onUpdate: 'cascade', onDelete: 'cascade' });

db.order.belongsToMany(db.product, {
  through: db.orderItem,
  foreignKey: 'order_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});
db.product.belongsToMany(db.order, {
  through: db.orderItem,
  foreignKey: 'product_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});

db.orderItem.belongsTo(db.order, { foreignKey: 'order_id' });
db.orderItem.belongsTo(db.product, { foreignKey: 'product_id' });
db.order.hasMany(db.orderItem, { foreignKey: 'order_id' });
db.product.hasMany(db.orderItem, { foreignKey: 'product_id' });

db.user.hasOne(db.cart, {
  foreignKey: 'user_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});
db.cart.belongsTo(db.user, {
  foreignKey: 'user_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});

db.product.hasMany(db.cartItem, {
  foreignKey: 'product_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});
db.cartItem.belongsTo(db.product, {
  foreignKey: 'product_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});

db.cart.hasMany(db.cartItem, {
  foreignKey: 'cart_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});
db.cartItem.belongsTo(db.cart, {
  foreignKey: 'cart_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});

db.user.hasMany(db.revenue, {
  foreignKey: 'user_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});

db.revenue.belongsTo(db.user, {
  foreignKey: 'user_id',
  onUpdate: 'cascade',
  onDelete: 'cascade',
});

module.exports = db;