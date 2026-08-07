const { createProxyMiddleware } = require('http-proxy-middleware');
const { createProxyBreaker } = require('@smartretailx/resilient-http');
const logger = require('./utils/logger');

/**
 * Proxy with opossum circuit breaker: after enough upstream failures the
 * gateway returns a 503 fallback instead of hammering a sick service.
 */
function createResilientProxy(target, name) {
  const { breaker, guard, recordSuccess, recordFailure, status } =
    createProxyBreaker(name, {
      errorThresholdPercentage: 50,
      resetTimeout: 10000,
      volumeThreshold: 5,
      timeout: 10000,
    });

  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyRes(proxyRes) {
        if (proxyRes.statusCode >= 500) {
          recordFailure();
        } else {
          recordSuccess();
        }
      },
      error(err, _req, res) {
        recordFailure();
        logger.error({ err, target, name }, 'Proxy error');
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                message: 'Bad gateway',
                target,
                service: name,
                fallback: true,
              },
            })
          );
        }
      },
    },
  });

  function middleware(req, res, next) {
    return guard(req, res, () => proxy(req, res, next));
  }

  middleware.breaker = breaker;
  middleware.status = status;
  return middleware;
}

module.exports = { createResilientProxy };
