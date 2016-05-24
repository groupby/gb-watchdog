const express = require('express');
const config = require('./config');

const createServer = function (configuration) {
  config.setConfig(configuration);

  const log    = config.log;
  const app    = express();
  const server = require('http').createServer(app);
  require('./config/express')(app);
  require('./app/routes')(app);

  app.config   = config;
  app.services = require('./app/services');

  app.run = () => {
    app.services.scheduler.start();

    server.listen(config.port, () => {
      log.info(`watchdog server listening on port ${config.port}`);
    });
  };

  app.stop = () => {
    app.services.scheduler.stop();
    server.close();
  };

  return app;
};

module.exports = createServer;