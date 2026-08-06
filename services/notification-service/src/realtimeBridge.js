const { EventTypes } = require('@smartretailx/events');

const REALTIME_TYPES = new Set([
  EventTypes.ORDER_CREATED,
  EventTypes.ORDER_STATUS_CHANGED,
  EventTypes.INVENTORY_UPDATED,
  EventTypes.PRICE_UPDATED,
]);

/**
 * Bridge domain events to Socket.IO rooms.
 */
function createRealtimeBridge(io, logger) {
  const emitted = [];

  function handleEvent(event) {
    if (!REALTIME_TYPES.has(event.type)) {
      return;
    }

    const envelope = {
      type: event.type,
      occurredAt: event.occurredAt,
      correlationId: event.correlationId,
      payload: event.payload,
    };

    emitted.push(envelope);

    // Broadcast to all clients + user-specific room when userId present
    io.emit('domain.event', envelope);
    if (event.payload?.userId) {
      io.to(`user:${event.payload.userId}`).emit('domain.event', envelope);
    }
    if (event.payload?.orderId) {
      io.to(`order:${event.payload.orderId}`).emit('domain.event', envelope);
    }

    logger.info({ type: event.type, correlationId: event.correlationId }, 'WebSocket emit');
  }

  return {
    handleEvent,
    getEmitted: () => [...emitted],
    clearEmitted: () => {
      emitted.length = 0;
    },
  };
}

module.exports = { createRealtimeBridge, REALTIME_TYPES };
