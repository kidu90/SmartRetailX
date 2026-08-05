const { v4: uuidv4 } = require('uuid');
const orderStore = require('../store/orderStore');
const catalogueClient = require('../clients/catalogueClient');
const paymentClient = require('../clients/paymentClient');
const eventPublisher = require('../events/eventPublisher');
const AppError = require('../utils/AppError');

const ALLOWED_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

async function createOrder({ userId, items, paymentMethod }) {
  const lineItems = [];
  let total = 0;

  for (const item of items) {
    const product = await catalogueClient.getProduct(item.productId);
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for product ${product.id}`, 400);
    }
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

  const orderId = uuidv4();
  const payment = await paymentClient.chargePayment({
    orderId,
    amount: total,
    method: paymentMethod,
    userId,
  });

  const status = payment.status === 'succeeded' ? 'paid' : 'pending';
  const order = orderStore.create({
    id: orderId,
    userId,
    items: lineItems,
    total: Number(total.toFixed(2)),
    paymentMethod,
    paymentId: payment.id,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  eventPublisher.publish('order.status.changed', {
    orderId: order.id,
    previousStatus: null,
    status: order.status,
    userId: order.userId,
  });

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

function updateOrderStatus(id, status) {
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

  eventPublisher.publish('order.status.changed', {
    orderId: updated.id,
    previousStatus,
    status: updated.status,
    userId: updated.userId,
  });

  return updated;
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  ALLOWED_TRANSITIONS,
};
