require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'notification-service',
  eventingMode: process.env.EVENTING_MODE || 'local',
  eventsQueueUrl: process.env.EVENTS_QUEUE_URL || process.env.NOTIFICATION_QUEUE_URL,
};
