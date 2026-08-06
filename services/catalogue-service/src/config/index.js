require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'catalogue-service',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
};

function applySecrets(secrets) {
  if (!secrets) return config;
  config.jwtSecret = secrets.jwtSecret || config.jwtSecret;
  return config;
}

module.exports = config;
module.exports.applySecrets = applySecrets;
