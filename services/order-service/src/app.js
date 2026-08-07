const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const {
  createPublisher,
  createConsumer,
  EventTypes,
} = require('@smartretailx/events');
const { instrumentExpress } = require('@smartretailx/observability');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const orderStore = require('./store/orderStore');
const config = require('./config');
const { createSagaHandlers } = require('./saga/orderPlacementSaga');

const swaggerDocument = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));

function createApp(options = {}) {
  const app = express();

  const publisher =
    options.publisher ||
    createPublisher({
      mode: config.eventingMode,
      topicArn: config.orderEventsTopicArn,
      httpTargets: config.eventHttpTargets,
    });

  const consumer =
    options.consumer ||
    createConsumer({
      mode: config.eventingMode,
      queueUrl: config.eventsQueueUrl,
    });

  const saga = createSagaHandlers(publisher);
  consumer.on(EventTypes.INVENTORY_RESERVED, saga.onInventoryReserved);
  consumer.on(EventTypes.INVENTORY_RESERVE_FAILED, saga.onInventoryReserveFailed);
  consumer.on(EventTypes.PAYMENT_SUCCEEDED, saga.onPaymentSucceeded);
  consumer.on(EventTypes.PAYMENT_FAILED, saga.onPaymentFailed);

  app.locals.publisher = publisher;
  app.locals.consumer = consumer;

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
  instrumentExpress(app, { serviceName: 'order-service', logger });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'order-service' });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready', orders: orderStore.count() });
  });

  app.post('/internal/events', consumer.expressHandler());

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/swagger.json', (_req, res) => res.json(swaggerDocument));

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return {
    app,
    publisher,
    consumer,
    async startConsumers() {
      await consumer.start();
    },
    stop() {
      consumer.stop();
    },
  };
}

/** Back-compat: tests that expect createApp() to return Express app */
function createExpressApp(options) {
  const ctx = createApp(options);
  // Attach helpers for tests
  ctx.app.startConsumers = () => ctx.startConsumers();
  ctx.app.stop = () => ctx.stop();
  ctx.app.locals._ctx = ctx;
  return ctx.app;
}

module.exports = createExpressApp;
module.exports.createApp = createApp;
