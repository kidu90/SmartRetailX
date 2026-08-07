const { createLogger } = require('@smartretailx/logger');
const config = require('../config');

module.exports = createLogger({
  serviceName: config.serviceName,
  level: config.logLevel,
});
