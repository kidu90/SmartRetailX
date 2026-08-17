require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'gateway',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  catalogueServiceUrl: process.env.CATALOGUE_SERVICE_URL || 'http://localhost:3002',
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3005',
  notificationServiceUrl:
    process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
};

function applySecrets(secrets) {
  if (!secrets) return config;
  config.jwtSecret = secrets.jwtSecret || config.jwtSecret;
  return config;
}

module.exports = config;
module.exports.applySecrets = applySecrets;
