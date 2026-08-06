const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const pinoHttp = require('pino-http');
const { ROLES, authenticate, requireRoles } = require('@smartretailx/auth-middleware');
const config = require('./config');
const logger = require('./utils/logger');
const { buildAggregatedSwagger } = require('./swagger/aggregate');

function createProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error(err, _req, res) {
        logger.error({ err, target }, 'Proxy error');
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Bad gateway', target } }));
        }
      },
    },
  });
}

function createApp() {
  const app = express();
  const swaggerDocument = buildAggregatedSwagger();
  const requireAuth = authenticate({ jwtSecret: () => config.jwtSecret });
  const requireCatalogueWriters = requireRoles(ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);
  const requireOrderAccess = requireRoles(ROLES.CUSTOMER, ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/ready' },
    })
  );

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'gateway' });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({
      status: 'ready',
      upstreams: {
        users: config.userServiceUrl,
        catalogue: config.catalogueServiceUrl,
        orders: config.orderServiceUrl,
      },
    });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/swagger.json', (_req, res) => res.json(swaggerDocument));

  // Public auth endpoints (register/login/refresh) — no JWT required
  app.use('/users', createProxy(config.userServiceUrl));

  // Catalogue reads are public; mutations checked here then re-checked upstream
  app.use('/catalogue', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return requireAuth(req, res, (err) => {
        if (err) return next(err);
        return requireCatalogueWriters(req, res, next);
      });
    }
    return next();
  }, createProxy(config.catalogueServiceUrl));

  // All order traffic requires a valid token + allowed role
  app.use('/orders', requireAuth, requireOrderAccess, createProxy(config.orderServiceUrl));

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        message: 'Route not found on gateway. Try /users/*, /catalogue/*, /orders/*, or /docs',
      },
    });
  });

  return app;
}

module.exports = createApp;
