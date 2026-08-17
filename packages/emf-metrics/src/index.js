const { createMetricsLogger, Unit, StorageResolution } = require('aws-embedded-metrics');

const NAMESPACE = process.env.CW_METRICS_NAMESPACE || 'SmartRetailX';

/**
 * Emit one EMF log line → CloudWatch custom metrics (no agent required).
 * Safe no-op failures so metrics never take down a request.
 */
async function withEmf(serviceName, fn) {
  const metrics = createMetricsLogger();
  metrics.setNamespace(NAMESPACE);
  metrics.putDimensions({ Service: serviceName });
  try {
    await fn(metrics, Unit, StorageResolution);
    await metrics.flush();
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[emf-metrics] flush failed for ${serviceName}:`, err.message);
    }
  }
}

/** HTTP request count + latency (+ 5xx / RBAC 403 counters). */
async function recordHttpRequest(serviceName, { method, route, statusCode, latencyMs }) {
  await withEmf(serviceName, async (metrics, Unit) => {
    metrics.putMetric('RequestCount', 1, Unit.Count);
    metrics.putMetric('Latency', Number(latencyMs) || 0, Unit.Milliseconds);
    if (statusCode >= 500) {
      metrics.putMetric('ServerErrorCount', 1, Unit.Count);
    }
    if (statusCode === 403) {
      metrics.putMetric('RbacDeniedCount', 1, Unit.Count);
    }
    metrics.setProperty('method', method);
    metrics.setProperty('route', route);
    metrics.setProperty('statusCode', statusCode);
  });
}

async function recordOrderCreated(serviceName) {
  await withEmf(serviceName, async (metrics, Unit) => {
    metrics.putMetric('OrdersCreated', 1, Unit.Count);
  });
}

async function recordCheckoutFailure(serviceName, reason = 'unknown') {
  await withEmf(serviceName, async (metrics, Unit) => {
    metrics.putMetric('CheckoutFailures', 1, Unit.Count);
    metrics.setProperty('reason', reason);
  });
}

function emfHttpMiddleware(serviceName) {
  return (req, res, next) => {
    if (req.path === '/metrics' || req.path === '/health' || req.path === '/ready') {
      return next();
    }
    const start = Date.now();
    res.on('finish', () => {
      const route = req.route?.path || req.path || 'unknown';
      recordHttpRequest(serviceName, {
        method: req.method,
        route,
        statusCode: res.statusCode,
        latencyMs: Date.now() - start,
      }).catch(() => {});
    });
    next();
  };
}

module.exports = {
  NAMESPACE,
  withEmf,
  recordHttpRequest,
  recordOrderCreated,
  recordCheckoutFailure,
  emfHttpMiddleware,
  Unit,
};
