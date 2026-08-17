const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {
  createConsumer,
  createPublisher,
  EventTypes,
} = require('@smartretailx/events');
const { instrumentExpress, closeTracing } = require('@smartretailx/observability');
const config = require('./config');
const logger = require('./utils/logger');
const { createPaymentHandlers } = require('./handlers');

function createApp(options = {}) {
  const app = express();
  const publisher =
    options.publisher || createPublisher({ mode: config.eventingMode });
  const consumer =
    options.consumer ||
    createConsumer({
      mode: config.eventingMode,
      queueUrl: config.eventsQueueUrl,
    });

  const handlers = createPaymentHandlers(publisher);
  consumer.on(EventTypes.PAYMENT_REQUESTED, handlers.onPaymentRequested);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
  instrumentExpress(app, { serviceName: 'payment-service', logger });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'payment-service' });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready' });
  });

  app.post('/internal/events', consumer.expressHandler());

  closeTracing(app);

  return {
    app,
    consumer,
    publisher,
    async start(listen = true) {
      await consumer.start();
      if (!listen) return;
      await new Promise((resolve) => app.listen(config.port, resolve));
    },
    stop() {
      consumer.stop();
    },
  };
}

module.exports = createApp;
