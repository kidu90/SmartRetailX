const { v4: uuidv4 } = require('uuid');
const { EventTypes } = require('@smartretailx/events');
const { recordOrderCreated } = require('@smartretailx/emf-metrics');
const orderStore = require('../store/orderStore');
const catalogueClient = require('../clients/catalogueClient');
const AppError = require('../utils/AppError');

const ALLOWED_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled', 'shipped'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Create order in `pending` and start the placement saga via events.
 * Inventory reservation + payment happen asynchronously.
 */
async function createOrder({ userId, items, paymentMethod }, publisher) {
  const lineItems = [];
  let total = 0;

  for (const item of items) {
    const product = await catalogueClient.getProduct(item.productId);
    const lineTotal = product.price * item.quantity;
    total += lineTotal;
    lineItems.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      lineTotal,
    });
  }

  const order = orderStore.create({
    id: uuidv4(),
    userId,
    items: lineItems,
    total: Number(total.toFixed(2)),
    paymentMethod,
    paymentId: null,
    status: 'pending',
    sagaState: 'awaiting_inventory',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await publisher.publish(
    EventTypes.ORDER_CREATED,
    {
      orderId: order.id,
      userId: order.userId,
      items: lineItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      paymentMethod,
      total: order.total,
    },
    { correlationId: order.id, source: 'order-service' }
  );

  await publisher.publish(
    EventTypes.ORDER_STATUS_CHANGED,
    {
      orderId: order.id,
      previousStatus: null,
      status: 'pending',
      userId: order.userId,
      items: order.items,
    },
    { correlationId: order.id, source: 'order-service' }
  );

  recordOrderCreated('order-service').catch(() => {});

  return order;
}

function listOrders(userId) {
  return orderStore.list(userId);
}

function getOrder(id) {
  const order = orderStore.findById(id);
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

async function updateOrderStatus(id, status, publisher) {
  const order = getOrder(id);
  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(
      `Cannot transition from ${order.status} to ${status}`,
      400
    );
  }

  const previousStatus = order.status;
  const updated = orderStore.update(id, { status });

  await publisher.publish(
    EventTypes.ORDER_STATUS_CHANGED,
    {
      orderId: updated.id,
      previousStatus,
      status: updated.status,
      userId: updated.userId,
      items: updated.items,
    },
    { correlationId: updated.id, source: 'order-service' }
  );

  return updated;
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  ALLOWED_TRANSITIONS,
};
