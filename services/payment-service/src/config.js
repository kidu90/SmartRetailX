require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: 'payment-service',
  eventingMode: process.env.EVENTING_MODE || 'local',
  eventsQueueUrl: process.env.EVENTS_QUEUE_URL || process.env.PAYMENT_QUEUE_URL,
  /** Set FORCE_PAYMENT_FAILURE=true to exercise saga compensation */
  forceFailure: process.env.FORCE_PAYMENT_FAILURE === 'true',
};
