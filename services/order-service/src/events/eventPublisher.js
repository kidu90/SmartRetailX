const { EventEmitter } = require('events');
const config = require('../config');
const logger = require('../utils/logger');

const bus = new EventEmitter();
const published = [];

function publish(eventType, payload) {
  if (!config.eventBusEnabled) {
    return null;
  }

  const event = {
    id: `${eventType}-${Date.now()}`,
    type: eventType,
    occurredAt: new Date().toISOString(),
    payload,
  };

  published.push(event);
  bus.emit(eventType, event);
  bus.emit('*', event);
  logger.info({ event }, 'Published domain event');
  return event;
}

function on(eventType, handler) {
  bus.on(eventType, handler);
}

function getPublished() {
  return [...published];
}

function clearPublished() {
  published.length = 0;
}

module.exports = { publish, on, getPublished, clearPublished, bus };
