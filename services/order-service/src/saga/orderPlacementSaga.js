const { EventTypes } = require('@smartretailx/events');
const orderStore = require('../store/orderStore');
const logger = require('../utils/logger');

/**
 * Choreography saga handlers living in order-service.
 *
 *   order.created
 *        → inventory.reserved  → payment.requested
 *        → inventory.reserve_failed → cancel
 *   payment.succeeded → paid
 *   payment.failed → inventory.release + cancel
 */
function createSagaHandlers(publisher) {
  async function onInventoryReserved(event) {
    const { orderId, userId, items } = event.payload;
    const order = orderStore.findById(orderId);
    if (!order || order.status !== 'pending') return;

    orderStore.update(orderId, { sagaState: 'awaiting_payment' });

    await publisher.publish(
      EventTypes.PAYMENT_REQUESTED,
      {
        orderId,
        userId,
        amount: order.total,
        method: order.paymentMethod,
        items: items || order.items,
      },
      { correlationId: orderId, source: 'order-service' }
    );

    logger.info({ orderId }, 'Saga: payment requested');
  }

  async function onInventoryReserveFailed(event) {
    const { orderId, userId } = event.payload;
    const order = orderStore.findById(orderId);
    if (!order) return;

    const previousStatus = order.status;
    orderStore.update(orderId, {
      status: 'cancelled',
      sagaState: 'failed_inventory',
    });

    await publisher.publish(
      EventTypes.ORDER_STATUS_CHANGED,
      {
        orderId,
        previousStatus,
        status: 'cancelled',
        userId,
        items: order.items,
        reason: 'inventory_reserve_failed',
      },
      { correlationId: orderId, source: 'order-service' }
    );

    logger.warn({ orderId }, 'Saga: cancelled — inventory reserve failed');
  }

  async function onPaymentSucceeded(event) {
    const { orderId, userId, paymentId } = event.payload;
    const order = orderStore.findById(orderId);
    if (!order || order.status !== 'pending') return;

    const previousStatus = order.status;
    const updated = orderStore.update(orderId, {
      status: 'paid',
      paymentId,
      sagaState: 'completed',
    });

    await publisher.publish(
      EventTypes.ORDER_STATUS_CHANGED,
      {
        orderId,
        previousStatus,
        status: 'paid',
        userId,
        items: updated.items,
        paymentId,
      },
      { correlationId: orderId, source: 'order-service' }
    );

    logger.info({ orderId }, 'Saga: payment succeeded — order paid');
  }

  async function onPaymentFailed(event) {
    const { orderId, userId, items, reason } = event.payload;
    const order = orderStore.findById(orderId);
    if (!order) return;

    const previousStatus = order.status;
    orderStore.update(orderId, {
      status: 'cancelled',
      sagaState: 'failed_payment',
    });

    // Compensating transaction
    await publisher.publish(
      EventTypes.INVENTORY_RELEASE,
      {
        orderId,
        userId,
        items: items || order.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        reason: reason || 'payment_failed',
      },
      { correlationId: orderId, source: 'order-service' }
    );

    await publisher.publish(
      EventTypes.ORDER_STATUS_CHANGED,
      {
        orderId,
        previousStatus,
        status: 'cancelled',
        userId,
        items: order.items,
        reason: reason || 'payment_failed',
      },
      { correlationId: orderId, source: 'order-service' }
    );

    logger.warn({ orderId, reason }, 'Saga: compensating inventory.release');
  }

  return {
    onInventoryReserved,
    onInventoryReserveFailed,
    onPaymentSucceeded,
    onPaymentFailed,
  };
}

module.exports = { createSagaHandlers };
