const { EventTypes } = require('@smartretailx/events');
const inventoryStore = require('./store/inventoryStore');
const logger = require('./utils/logger');

function createInventoryHandlers(publisher) {
  async function onOrderCreated(event) {
    const { orderId, userId, items = [] } = event.payload;
    const reservedItems = [];

    for (const item of items) {
      const result = inventoryStore.reserve(item.productId, item.quantity);
      if (!result.ok) {
        // Compensating: release anything reserved in this batch
        for (const prev of reservedItems) {
          inventoryStore.release(prev.productId, prev.quantity);
        }
        await publisher.publish(EventTypes.INVENTORY_RESERVE_FAILED, {
          orderId,
          userId,
          productId: item.productId,
          requested: item.quantity,
          available: result.available,
        }, { correlationId: orderId, source: 'inventory-service' });
        return;
      }
      reservedItems.push(item);
    }

    await publisher.publish(
      EventTypes.INVENTORY_RESERVED,
      { orderId, userId, items: reservedItems },
      { correlationId: orderId, source: 'inventory-service' }
    );

    for (const item of reservedItems) {
      const row = inventoryStore.get(item.productId);
      await publisher.publish(
        EventTypes.INVENTORY_UPDATED,
        {
          productId: item.productId,
          stock: row.stock,
          reserved: row.reserved,
          available: row.stock - row.reserved,
          reason: 'reserve',
          orderId,
        },
        { correlationId: orderId, source: 'inventory-service' }
      );
    }

    logger.info({ orderId, items: reservedItems.length }, 'Inventory reserved');
  }

  async function onInventoryRelease(event) {
    const { orderId, items = [] } = event.payload;
    for (const item of items) {
      const row = inventoryStore.release(item.productId, item.quantity);
      await publisher.publish(
        EventTypes.INVENTORY_UPDATED,
        {
          productId: item.productId,
          stock: row.stock,
          reserved: row.reserved,
          available: row.stock - row.reserved,
          reason: 'release',
          orderId,
        },
        { correlationId: orderId, source: 'inventory-service' }
      );
    }
    logger.info({ orderId }, 'Inventory released (compensation)');
  }

  async function onOrderStatusChanged(event) {
    // When order becomes paid, commit reserved stock
    const { orderId, status, items = [] } = event.payload;
    if (status !== 'paid' || !items.length) return;

    for (const item of items) {
      const row = inventoryStore.commit(item.productId, item.quantity);
      await publisher.publish(
        EventTypes.INVENTORY_UPDATED,
        {
          productId: item.productId,
          stock: row.stock,
          reserved: row.reserved,
          available: row.stock - row.reserved,
          reason: 'commit',
          orderId,
        },
        { correlationId: orderId, source: 'inventory-service' }
      );
    }
  }

  return { onOrderCreated, onInventoryRelease, onOrderStatusChanged };
}

module.exports = { createInventoryHandlers };
