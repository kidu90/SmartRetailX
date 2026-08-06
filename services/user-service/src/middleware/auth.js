const { authenticate } = require('@smartretailx/auth-middleware');
const config = require('../config');

module.exports = authenticate({
  jwtSecret: () => config.jwtSecret,
});
