const { initTracing } = require('@smartretailx/tracing');
const createApp = require('./app');

async function main() {
  await initTracing('notification-service');
  await createApp().start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
