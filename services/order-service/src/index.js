const { loadServiceSecrets } = require('@smartretailx/secrets-client');
const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

async function main() {
  const secrets = await loadServiceSecrets();
  config.applySecrets(secrets);
  if (secrets.database?.host) {
    logger.info({ host: secrets.database.host }, 'DB credentials loaded');
  }
  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'order-service listening');
  });
}

main().catch((err) => {
  console.error('Failed to start order-service', err);
  process.exit(1);
});
