const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { ROLES, authenticate, requireRoles } = require('@smartretailx/auth-middleware');
const { instrumentExpress, closeTracing } = require('@smartretailx/observability');
const config = require('./config');
const logger = require('./utils/logger');
const { buildAggregatedSwagger } = require('./swagger/aggregate');
const { createResilientProxy } = require('./proxy');
const { createCloudWatchMetrics } = require('./cloudwatchMetrics');

async function probe(name, baseUrl) {
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    return {
      service: name,
      url: baseUrl,
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      service: name,
      url: baseUrl,
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      error: err.message,
    };
  }
}

function createApp() {
  const app = express();
  const swaggerDocument = buildAggregatedSwagger();
  const requireAuth = authenticate({ jwtSecret: () => config.jwtSecret });
  const requireCatalogueWriters = requireRoles(ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);
  const requireOrderAccess = requireRoles(ROLES.CUSTOMER, ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);
  const requireInventoryAccess = requireRoles(ROLES.ADMIN, ROLES.WAREHOUSE_STAFF);
  const requireAdmin = requireRoles(ROLES.ADMIN);
  const cwMetrics = createCloudWatchMetrics({
    region: config.awsRegion,
    namespace: config.cwMetricsNamespace,
    dashboardName: config.cwDashboardName,
    dashboardConsoleUrl: config.cwDashboardUrl,
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  instrumentExpress(app, { serviceName: 'gateway', logger });

  const usersProxy = createResilientProxy(config.userServiceUrl, 'user-service', {
    stripPrefix: '/users',
  });
  const catalogueProxy = createResilientProxy(
    config.catalogueServiceUrl,
    'catalogue-service',
    { stripPrefix: '/catalogue' }
  );
  const ordersProxy = createResilientProxy(config.orderServiceUrl, 'order-service', {
    stripPrefix: '/orders',
  });
  const inventoryProxy = createResilientProxy(
    config.inventoryServiceUrl,
    'inventory-service',
    { stripPrefix: '/inventory' }
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
        inventory: config.inventoryServiceUrl,
        payment: config.paymentServiceUrl,
        notification: config.notificationServiceUrl,
      },
      breakers: {
        users: usersProxy.status(),
        catalogue: catalogueProxy.status(),
        orders: ordersProxy.status(),
        inventory: inventoryProxy.status(),
      },
    });
  });

  /** Aggregated upstream health for admin dashboard (Task 7 evidence) */
  app.get('/health/services', requireAuth, requireAdmin, async (_req, res) => {
    const checks = await Promise.all([
      probe('gateway', `http://127.0.0.1:${config.port}`),
      probe('user-service', config.userServiceUrl),
      probe('catalogue-service', config.catalogueServiceUrl),
      probe('order-service', config.orderServiceUrl),
      probe('payment-service', config.paymentServiceUrl),
      probe('inventory-service', config.inventoryServiceUrl),
      probe('notification-service', config.notificationServiceUrl),
    ]);
    checks[0] = {
      service: 'gateway',
      url: `http://localhost:${config.port}`,
      ok: true,
      status: 200,
      latencyMs: 0,
    };
    res.status(200).json({
      checkedAt: new Date().toISOString(),
      services: checks,
      allHealthy: checks.every((c) => c.ok),
    });
  });

  /**
   * Read-only CloudWatch summary (EMF last hour) for in-app charts.
   * Admin JWT required. Uses IRSA CloudWatch read policy in EKS.
   */
  app.get('/ops/metrics/summary', requireAuth, requireAdmin, async (_req, res, next) => {
    try {
      const summary = await cwMetrics.getHourlySummary();
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
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

  app.use('/inventory', requireAuth, requireInventoryAccess, inventoryProxy);

  closeTracing(app);

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        message:
          'Route not found on gateway. Try /users/*, /catalogue/*, /orders/*, /inventory/*, /ops/*, or /docs',
      },
    });
  });

  return app;
}

module.exports = createApp;
