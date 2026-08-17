const pinoHttp = require('pino-http');
const { createLogger, httpIgnorePaths } = require('@smartretailx/logger');
const { createMetrics } = require('@smartretailx/metrics');
const { initTracing, tracingMiddleware, closeTracing } = require('@smartretailx/tracing');
const { emfHttpMiddleware } = require('@smartretailx/emf-metrics');

/**
 * Attach structured logging (stdout JSON), local /metrics, EMF HTTP metrics,
 * and optional AWS X-Ray / OTel middleware.
 *
 * Call initTracing(serviceName) once at process startup (before listen).
 * Call closeTracing(app) after all routes (before error handlers) when X-Ray is on.
 */
function instrumentExpress(app, { serviceName, logger: existingLogger } = {}) {
  const logger = existingLogger || createLogger({ serviceName });
  const metrics = createMetrics({ serviceName });

  app.use(tracingMiddleware(serviceName));
  metrics.mount(app);
  app.use(emfHttpMiddleware(serviceName));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => httpIgnorePaths(req.url || ''),
      },
    })
  );

  return { logger, metrics, closeTracing: () => closeTracing(app) };
}

module.exports = {
  createLogger,
  httpIgnorePaths,
  createMetrics,
  initTracing,
  tracingMiddleware,
  closeTracing,
  instrumentExpress,
};
