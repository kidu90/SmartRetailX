const createApp = require('./app');

createApp()
  .start()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
