const { createProxyMiddleware } = require('http-proxy-middleware');
const { createProxyBreaker } = require('@smartretailx/resilient-http');
const logger = require('./utils/logger');

/**
 * Proxy with opossum circuit breaker.
 * Strips the gateway mount prefix so /users/api/v1/... → /api/v1/... upstream.
 */
function createResilientProxy(target, name, { stripPrefix } = {}) {
  const prefix = stripPrefix || `/${name.replace(/-service$/, '')}`;
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
    pathRewrite: (path) => {
      if (path.startsWith(prefix)) {
        return path.slice(prefix.length) || '/';
      }
      return path;
    },
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
