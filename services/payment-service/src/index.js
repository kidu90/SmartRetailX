const { initTracing } = require('@smartretailx/tracing');
const createApp = require('./app');
const logger = require('./utils/logger');

async function main() {
  await initTracing('payment-service');
  await createApp().start();
  logger.info('payment-service started');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
