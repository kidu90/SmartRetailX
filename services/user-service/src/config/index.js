require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'user-service',
};

module.exports = config;
