const { loadServiceSecrets } = require('@smartretailx/secrets-client');
const createExpressApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

async function main() {
  const secrets = await loadServiceSecrets();
  config.applySecrets(secrets);
  const app = createExpressApp();
  await app.startConsumers();
  app.listen(config.port, () => {
    logger.info({ port: config.port, mode: config.eventingMode }, 'order-service listening');
  });
}

main().catch((err) => {
  console.error('Failed to start order-service', err);
  process.exit(1);
});
