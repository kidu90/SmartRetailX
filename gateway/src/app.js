const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { ROLES, authenticate, requireRoles } = require('@smartretailx/auth-middleware');
const { instrumentExpress } = require('@smartretailx/observability');
const config = require('./config');
const logger = require('./utils/logger');
const { buildAggregatedSwagger } = require('./swagger/aggregate');
const { createResilientProxy } = require('./proxy');

function createApp() {
  const app = express();
  const swaggerDocument = buildAggregatedSwagger();
  const requireAuth = authenticate({ jwtSecret: () => config.jwtSecret });
  const requireCatalogueWriters = requireRoles(ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);
  const requireOrderAccess = requireRoles(ROLES.CUSTOMER, ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  instrumentExpress(app, { serviceName: 'gateway', logger });

  const usersProxy = createResilientProxy(config.userServiceUrl, 'user-service');
  const catalogueProxy = createResilientProxy(
    config.catalogueServiceUrl,
    'catalogue-service'
  );
  const ordersProxy = createResilientProxy(config.orderServiceUrl, 'order-service');

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
      breakers: {
        users: usersProxy.status(),
        catalogue: catalogueProxy.status(),
        orders: ordersProxy.status(),
      },
    });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/swagger.json', (_req, res) => res.json(swaggerDocument));

  app.use('/users', usersProxy);

  app.use('/catalogue', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return requireAuth(req, res, (err) => {
        if (err) return next(err);
        return requireCatalogueWriters(req, res, next);
      });
    }
    return next();
  }, catalogueProxy);

  app.use('/orders', requireAuth, requireOrderAccess, ordersProxy);

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
