const rateLimit = require('express-rate-limit');
const config = require('../config');

const loginRateLimiter = rateLimit({
  windowMs: config.loginRateLimitWindowMs,
  max: config.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many login attempts. Try again later.',
    },
  },
});

module.exports = { loginRateLimiter };
