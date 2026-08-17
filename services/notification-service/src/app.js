const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { createConsumer, EventTypes } = require('@smartretailx/events');
const { instrumentExpress, closeTracing } = require('@smartretailx/observability');
const config = require('./config');
const logger = require('./utils/logger');
const { createRealtimeBridge } = require('./realtimeBridge');

function createApp(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
    path: '/socket.io',
  });

  const bridge = createRealtimeBridge(io, logger);
  const consumer = options.consumer || createConsumer({
    mode: config.eventingMode,
    queueUrl: config.eventsQueueUrl,
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
  instrumentExpress(app, { serviceName: 'notification-service', logger });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'notification-service' });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready', mode: config.eventingMode });
  });

  // Docker/local HTTP fan-out + test injection
  app.post('/internal/events', consumer.expressHandler());

  io.on('connection', (socket) => {
    socket.on('subscribe', (rooms = []) => {
      for (const room of rooms) {
        socket.join(room);
      }
    });
  });

  for (const type of [
    EventTypes.ORDER_CREATED,
    EventTypes.ORDER_STATUS_CHANGED,
    EventTypes.INVENTORY_UPDATED,
    EventTypes.PRICE_UPDATED,
  ]) {
    consumer.on(type, (event) => bridge.handleEvent(event));
  }

  closeTracing(app);

  return {
    app,
    server,
    io,
    consumer,
    bridge,
    async start() {
      await consumer.start();
      await new Promise((resolve) => server.listen(config.port, resolve));
      logger.info({ port: config.port }, 'notification-service listening');
    },
    async stop() {
      consumer.stop();
      await new Promise((resolve) => server.close(resolve));
      io.close();
    },
  };
}

module.exports = createApp;
