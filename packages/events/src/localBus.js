const { EventEmitter } = require('events');

/**
 * Process-local bus for tests and single-process fan-out.
 * All services in the same Node process share this singleton.
 */
const localBus = new EventEmitter();
localBus.setMaxListeners(50);

const history = [];

function publishLocal(event) {
  history.push(event);
  localBus.emit(event.type, event);
  localBus.emit('*', event);
  return event;
}

function subscribeLocal(eventType, handler) {
  localBus.on(eventType, handler);
  return () => localBus.off(eventType, handler);
}

function getHistory() {
  return [...history];
}

function clearHistory() {
  history.length = 0;
}

function resetBus() {
  history.length = 0;
  localBus.removeAllListeners();
}

module.exports = {
  localBus,
  publishLocal,
  subscribeLocal,
  getHistory,
  clearHistory,
  resetBus,
};
