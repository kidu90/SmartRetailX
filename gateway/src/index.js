const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const app = createApp();

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'gateway listening');
});
