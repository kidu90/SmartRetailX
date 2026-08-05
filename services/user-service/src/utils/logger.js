const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.logLevel,
  name: config.serviceName,
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
});

module.exports = logger;
