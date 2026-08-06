/**
 * Canonical event type names for SmartRetailX.
 */
const EventTypes = Object.freeze({
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  INVENTORY_RESERVE: 'inventory.reserve',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RESERVE_FAILED: 'inventory.reserve_failed',
  INVENTORY_RELEASE: 'inventory.release',
  INVENTORY_UPDATED: 'inventory.updated',
  PRICE_UPDATED: 'price.updated',
  PAYMENT_REQUESTED: 'payment.requested',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
});

function createEvent(type, payload, options = {}) {
  return {
    id: options.id || `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    source: options.source || 'smartretailx',
    correlationId: options.correlationId || payload.orderId || payload.productId || null,
    occurredAt: options.occurredAt || new Date().toISOString(),
    payload,
  };
}

module.exports = { EventTypes, createEvent };
