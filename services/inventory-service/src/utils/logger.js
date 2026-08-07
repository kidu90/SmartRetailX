const { createLogger } = require('@smartretailx/logger');
const config = require('../config');

module.exports = createLogger({
  serviceName: config.serviceName || 'inventory-service',
  level: config.logLevel || 'info',
});
