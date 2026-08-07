const { loadServiceSecrets } = require('@smartretailx/secrets-client');
const { initTracing } = require('@smartretailx/tracing');
const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

async function main() {
  await initTracing('catalogue-service');
  const secrets = await loadServiceSecrets();
  config.applySecrets(secrets);
  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'catalogue-service listening');
  });
}

main().catch((err) => {
  console.error('Failed to start catalogue-service', err);
  process.exit(1);
});
