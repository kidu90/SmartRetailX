const pino = require('pino');

/**
 * Shared structured JSON logger.
 * CloudWatch Logs / Fluent Bit / Filebeat can ingest stdout as-is.
 */
function createLogger({
  serviceName,
  level = process.env.LOG_LEVEL || 'info',
} = {}) {
  if (!serviceName) {
    throw new Error('createLogger requires serviceName');
  }

  return pino({
    level,
    name: serviceName,
    base: {
      service: serviceName,
      env: process.env.NODE_ENV || 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    messageKey: 'msg',
  });
}

function httpIgnorePaths(url = '') {
  return (
    url.startsWith('/health') ||
    url.startsWith('/ready') ||
    url.startsWith('/metrics')
  );
}

module.exports = { createLogger, httpIgnorePaths };
