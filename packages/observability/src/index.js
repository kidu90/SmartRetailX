const pinoHttp = require('pino-http');
const { createLogger, httpIgnorePaths } = require('@smartretailx/logger');
const { createMetrics } = require('@smartretailx/metrics');
const { initTracing, tracingMiddleware } = require('@smartretailx/tracing');

/**
 * Attach structured logging, /metrics, and optional OTel middleware.
 * Call initTracing(serviceName) once at process startup (before listen).
 */
function instrumentExpress(app, { serviceName, logger: existingLogger } = {}) {
  const logger = existingLogger || createLogger({ serviceName });
  const metrics = createMetrics({ serviceName });

  app.use(tracingMiddleware(serviceName));
  metrics.mount(app);
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => httpIgnorePaths(req.url || ''),
      },
    })
  );

  return { logger, metrics };
}

module.exports = {
  createLogger,
  httpIgnorePaths,
  createMetrics,
  initTracing,
  tracingMiddleware,
  instrumentExpress,
};
