const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Missing or invalid Authorization header', 401));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
}

module.exports = authenticate;
