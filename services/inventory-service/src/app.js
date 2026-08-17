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
const inventoryStore = require('./store/inventoryStore');
const { createInventoryHandlers } = require('./handlers');

function createApp(options = {}) {
  const app = express();
  const publisher =
    options.publisher ||
    createPublisher({ mode: config.eventingMode });
  const consumer =
    options.consumer ||
    createConsumer({
      mode: config.eventingMode,
      queueUrl: config.eventsQueueUrl,
    });

  const handlers = createInventoryHandlers(publisher);

  consumer.on(EventTypes.ORDER_CREATED, handlers.onOrderCreated);
  consumer.on(EventTypes.INVENTORY_RELEASE, handlers.onInventoryRelease);
  consumer.on(EventTypes.ORDER_STATUS_CHANGED, handlers.onOrderStatusChanged);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
  instrumentExpress(app, { serviceName: 'inventory-service', logger });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'inventory-service' });
  });

  app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready', mode: config.eventingMode });
  });

  app.get('/api/v1/stock', (_req, res) => {
    const snapshot = inventoryStore.snapshot();
    const items = Object.entries(snapshot).map(([productId, row]) => ({
      productId,
      ...row,
      available: row.stock - row.reserved,
    }));
    res.json({ items, count: items.length });
  });

  app.get('/api/v1/stock/:productId', (req, res) => {
    const row = inventoryStore.ensure(req.params.productId);
    res.json({
      productId: req.params.productId,
      ...row,
      available: row.stock - row.reserved,
    });
  });

  app.post('/api/v1/stock/:productId/seed', (req, res) => {
    const qty = Number(req.body.quantity ?? 100);
    const row = inventoryStore.seed(req.params.productId, qty);
    res.status(201).json({ productId: req.params.productId, ...row });
  });

  /** Set absolute stock level (admin/warehouse via gateway RBAC). */
  app.patch('/api/v1/stock/:productId', (req, res) => {
    const qty = Number(req.body.quantity ?? req.body.stock);
    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({
        error: { message: 'quantity (or stock) must be a non-negative number' },
      });
    }
    const existing = inventoryStore.ensure(req.params.productId);
    const row = inventoryStore.seed(req.params.productId, qty);
    // Preserve reserved when adjusting absolute stock
    row.reserved = Math.min(existing.reserved, qty);
    res.status(200).json({
      productId: req.params.productId,
      ...row,
      available: row.stock - row.reserved,
    });
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
      await new Promise((resolve) => {
        app.listen(config.port, resolve);
      });
      logger.info({ port: config.port }, 'inventory-service listening');
    },
    stop() {
      consumer.stop();
    },
  };
}

module.exports = createApp;
