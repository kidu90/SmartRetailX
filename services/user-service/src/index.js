const { loadServiceSecrets } = require('@smartretailx/secrets-client');
const { initTracing } = require('@smartretailx/tracing');
const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

async function main() {
  await initTracing('user-service');
  const secrets = await loadServiceSecrets();
  config.applySecrets(secrets);

  if (secrets.database?.host) {
    logger.info(
      { host: secrets.database.host, db: secrets.database.database },
      'Database credentials loaded (Secrets Manager or env fallback)'
    );
  }

  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'user-service listening');
  });
}

main().catch((err) => {
  console.error('Failed to start user-service', err);
  process.exit(1);
});
