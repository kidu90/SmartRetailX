require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'user-service',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  loginRateLimitWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10),
  loginRateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
  database: null,
};

function applySecrets(secrets) {
  if (!secrets) return config;
  config.jwtSecret = secrets.jwtSecret || config.jwtSecret;
  config.jwtExpiresIn = secrets.jwtExpiresIn || config.jwtExpiresIn;
  config.jwtRefreshExpiresIn = secrets.jwtRefreshExpiresIn || config.jwtRefreshExpiresIn;
  config.database = secrets.database || null;
  return config;
}

module.exports = config;
module.exports.applySecrets = applySecrets;
