require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'gateway',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  catalogueServiceUrl: process.env.CATALOGUE_SERVICE_URL || 'http://localhost:3002',
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
};

module.exports = config;
