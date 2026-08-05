const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const pinoHttp = require('pino-http');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const catalogueStore = require('./store/catalogueStore');

const swaggerDocument = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));

function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/ready' },
    })
  );

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'catalogue-service' });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready', ...catalogueStore.counts() });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/swagger.json', (_req, res) => res.json(swaggerDocument));

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
