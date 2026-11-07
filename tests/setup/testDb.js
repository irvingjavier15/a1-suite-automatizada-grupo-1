const { sequelize } = require('../../models/');
require('../../models/orderLine');

// Initialize models with test database
const initTestDb = async () => {
  // Sync database
  await sequelize.sync({ force: true });
};

// Clean up database
const closeTestDb = async () => {
  await sequelize.close();
};

module.exports = {
  sequelize,
  initTestDb,
  closeTestDb
};