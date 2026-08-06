const { loadServiceSecrets } = require('@smartretailx/secrets-client');
const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

async function main() {
  const secrets = await loadServiceSecrets();
  config.applySecrets(secrets);
  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'gateway listening');
  });
}

main().catch((err) => {
  console.error('Failed to start gateway', err);
  process.exit(1);
});
