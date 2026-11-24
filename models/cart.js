const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Cart = sequelize.define('Cart', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true, //type pide INTEGER
    },
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'open',
  },
});

module.exports = Cart;
