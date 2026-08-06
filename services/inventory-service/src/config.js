require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'inventory-service',
  eventingMode: process.env.EVENTING_MODE || 'local',
  eventsQueueUrl: process.env.EVENTS_QUEUE_URL || process.env.INVENTORY_QUEUE_URL,
  catalogueServiceUrl: process.env.CATALOGUE_SERVICE_URL || 'http://localhost:3002',
};
