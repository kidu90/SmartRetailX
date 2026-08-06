const { EventTypes, createEvent } = require('@smartretailx/events');
const { createRealtimeBridge } = require('../../src/realtimeBridge');

describe('realtimeBridge', () => {
  it('emits domain.event on socket.io for order/inventory events', () => {
    const emittedTo = [];
    const io = {
      emit: (name, payload) => emittedTo.push({ room: '*', name, payload }),
      to: (room) => ({
        emit: (name, payload) => emittedTo.push({ room, name, payload }),
      }),
    };
    const logger = { info: jest.fn() };
    const bridge = createRealtimeBridge(io, logger);

    bridge.handleEvent(
      createEvent(EventTypes.ORDER_CREATED, {
        orderId: 'o1',
        userId: 'u1',
      })
    );

    expect(bridge.getEmitted()).toHaveLength(1);
    expect(emittedTo.some((e) => e.room === '*' && e.name === 'domain.event')).toBe(true);
    expect(emittedTo.some((e) => e.room === 'user:u1')).toBe(true);
    expect(emittedTo.some((e) => e.room === 'order:o1')).toBe(true);
  });
});
