const { createLogger } = require('@smartretailx/logger');
const config = require('../config');

module.exports = createLogger({
  serviceName: config.serviceName || 'payment-service',
  level: config.logLevel || 'info',
});
