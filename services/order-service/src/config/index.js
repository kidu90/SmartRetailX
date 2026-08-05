require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'order-service',
  catalogueServiceUrl: process.env.CATALOGUE_SERVICE_URL || 'http://localhost:3002',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
  eventBusEnabled: process.env.EVENT_BUS_ENABLED !== 'false',
};

module.exports = config;
