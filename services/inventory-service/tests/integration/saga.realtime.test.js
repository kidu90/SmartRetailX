/**
 * Cross-service saga + realtime integration test.
 * Simulates: order.created → inventory reserve → payment → WebSocket notify.
 */
const {
  clearHistory,
  resetBus,
  getHistory,
  EventTypes,
  createPublisher,
  createConsumer,
} = require('@smartretailx/events');

const createInventoryApp = require('../../src/app');
const createPaymentApp = require('../../../payment-service/src/app');
const createNotificationApp = require('../../../notification-service/src/app');
const createOrderApp = require('../../../order-service/src/app');
const inventoryStore = require('../../src/store/inventoryStore');
const orderStore = require('../../../order-service/src/store/orderStore');
const catalogueClient = require('../../../order-service/src/clients/catalogueClient');
const paymentConfig = require('../../../payment-service/src/config');

jest.mock('../../../order-service/src/clients/catalogueClient');

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';

function waitFor(predicate, timeoutMs = 3000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        if (predicate()) return resolve();
      } catch (err) {
        return reject(err);
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('timeout waiting for condition'));
      }
      setTimeout(tick, 15);
    };
    tick();
  });
}

describe('event-driven order saga + inventory + notifications', () => {
  let inventory;
  let payment;
  let notification;
  let orderApp;
  let publisher;

  beforeEach(async () => {
    resetBus();
    clearHistory();
    inventoryStore.clear();
    orderStore.clear();
    inventoryStore.seed(PRODUCT_ID, 10);
    paymentConfig.forceFailure = false;

    publisher = createPublisher({ mode: 'local' });

    inventory = createInventoryApp({
      publisher,
      consumer: createConsumer({ mode: 'local' }),
    });
    payment = createPaymentApp({
      publisher,
      consumer: createConsumer({ mode: 'local' }),
    });
    notification = createNotificationApp({
      consumer: createConsumer({ mode: 'local' }),
    });
    orderApp = createOrderApp({
      publisher,
      consumer: createConsumer({ mode: 'local' }),
    });

    await inventory.start(false);
    await payment.start(false);
    await notification.consumer.start();
    await orderApp.startConsumers();

    catalogueClient.getProduct.mockResolvedValue({
      id: PRODUCT_ID,
      name: 'Widget',
      price: 25,
      stock: 10,
    });
  });

  afterEach(() => {
    inventory.stop();
    payment.stop();
    notification.consumer.stop();
    orderApp.stop();
    paymentConfig.forceFailure = false;
    resetBus();
  });

  it('decrements stock and emits WebSocket events on happy-path saga', async () => {
    const orderService = require('../../../order-service/src/services/orderService');

    const order = await orderService.createOrder(
      {
        userId: 'user-1',
        items: [{ productId: PRODUCT_ID, quantity: 2 }],
        paymentMethod: 'card',
      },
      publisher
    );

    expect(order.status).toBe('pending');

    await waitFor(() => orderStore.findById(order.id)?.status === 'paid');

    const stock = inventoryStore.get(PRODUCT_ID);
    expect(stock.stock).toBe(8);
    expect(stock.reserved).toBe(0);

    await waitFor(() =>
      notification.bridge.getEmitted().some((e) => e.type === EventTypes.ORDER_CREATED)
    );
    await waitFor(() =>
      notification.bridge
        .getEmitted()
        .some((e) => e.type === EventTypes.INVENTORY_UPDATED)
    );
    await waitFor(() =>
      notification.bridge
        .getEmitted()
        .some(
          (e) =>
            e.type === EventTypes.ORDER_STATUS_CHANGED && e.payload.status === 'paid'
        )
    );

    const types = getHistory().map((e) => e.type);
    expect(types).toContain(EventTypes.ORDER_CREATED);
    expect(types).toContain(EventTypes.INVENTORY_RESERVED);
    expect(types).toContain(EventTypes.PAYMENT_REQUESTED);
    expect(types).toContain(EventTypes.PAYMENT_SUCCEEDED);
  });

  it('releases inventory when payment fails (compensating transaction)', async () => {
    paymentConfig.forceFailure = true;
    const orderService = require('../../../order-service/src/services/orderService');

    const order = await orderService.createOrder(
      {
        userId: 'user-2',
        items: [{ productId: PRODUCT_ID, quantity: 3 }],
        paymentMethod: 'card',
      },
      publisher
    );

    await waitFor(() => orderStore.findById(order.id)?.status === 'cancelled');

    const stock = inventoryStore.get(PRODUCT_ID);
    expect(stock.reserved).toBe(0);
    expect(stock.stock).toBe(10);

    const types = getHistory().map((e) => e.type);
    expect(types).toContain(EventTypes.PAYMENT_FAILED);
    expect(types).toContain(EventTypes.INVENTORY_RELEASE);
  });
});
