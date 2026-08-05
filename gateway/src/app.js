const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const pinoHttp = require('pino-http');
const config = require('./config');
const logger = require('./utils/logger');
const { buildAggregatedSwagger } = require('./swagger/aggregate');

function createProxy(target) {
  // Mounted under /users, /catalogue, /orders — Express already strips the
  // mount prefix, so upstreams receive /api/v1/... (or /health, /docs, etc.).
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

  // Gateway routes: /users/*, /catalogue/*, /orders/*
  app.use('/users', createProxy(config.userServiceUrl));
  app.use('/catalogue', createProxy(config.catalogueServiceUrl));
  app.use('/orders', createProxy(config.orderServiceUrl));

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
