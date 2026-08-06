require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: process.env.SERVICE_NAME || 'order-service',
  catalogueServiceUrl: process.env.CATALOGUE_SERVICE_URL || 'http://localhost:3002',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
  eventBusEnabled: process.env.EVENT_BUS_ENABLED !== 'false',
  eventingMode: process.env.EVENTING_MODE || 'local',
  orderEventsTopicArn: process.env.ORDER_EVENTS_TOPIC_ARN,
  eventsQueueUrl: process.env.EVENTS_QUEUE_URL || process.env.ORDER_QUEUE_URL,
  eventHttpTargets: process.env.EVENT_HTTP_TARGETS || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  database: null,
};

function applySecrets(secrets) {
  if (!secrets) return config;
  config.jwtSecret = secrets.jwtSecret || config.jwtSecret;
  config.database = secrets.database || null;
  return config;
}

module.exports = config;
module.exports.applySecrets = applySecrets;
