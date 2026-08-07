const client = require('prom-client');

/**
 * Per-process Prometheus registry + HTTP histogram middleware.
 */
function createMetrics({ serviceName } = {}) {
  if (!serviceName) {
    throw new Error('createMetrics requires serviceName');
  }

  const register = new client.Registry();
  register.setDefaultLabels({ service: serviceName });
  client.collectDefaultMetrics({ register });

  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  function middleware(req, res, next) {
    if (req.path === '/metrics') return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const elapsedNs = Number(process.hrtime.bigint() - start);
      const seconds = elapsedNs / 1e9;
      const route = req.route?.path || req.path || 'unknown';
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      httpRequestDuration.observe(labels, seconds);
      httpRequestsTotal.inc(labels);
    });
    next();
  }

  async function metricsHandler(_req, res) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }

  function mount(app) {
    app.use(middleware);
    app.get('/metrics', metricsHandler);
  }

  return {
    register,
    middleware,
    metricsHandler,
    mount,
    httpRequestDuration,
    httpRequestsTotal,
  };
}

module.exports = { createMetrics };
