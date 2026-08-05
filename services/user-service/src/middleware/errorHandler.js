const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    error: {
      message: err.message || 'Internal Server Error',
      ...(err.details ? { details: err.details } : {}),
    },
  };

  if (statusCode >= 500) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  } else {
    logger.warn({ err: { message: err.message, statusCode }, path: req.originalUrl }, 'Request error');
  }

  res.status(statusCode).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
