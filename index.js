const express = require('express');
const config  = require('./config');

const createServer = function (configuration) {
  config.setConfig(configuration);

  const log    = config.log;
  const app    = express();
  const server = require('http').createServer(app);

  app.config   = config;
  app.services = require('./app/services')(config);

  require('./config/express')(app, config);
  require('./app/routes')(app, config);

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

  // Graceful shutdown from SIGTERM
  process.on('SIGTERM', () => {
    log.warn('SIGTERM received stopping server...');
    app.services.scheduler.stop();

    server.close(() => {
      log.warn('Server stopped, exiting ...');
      process.exit(0);
    });
  });

  // Socket errors are usually caused by an invalid query string or url
  // This is caught before Node creates req and res objects, so we have to manually write to the socket in response
  server.on('clientError', (err, socket) => {
    if (socket.readyStatus !== 'closed') {
      log.error(`Error during request: ${err}`);
      const error = 'Error: Invalid request format or query string\r\n\r\n';
      socket.write('HTTP/1.1 400 Bad Request\r\n');
      socket.write('Content-Type: text/plain\r\n');
      socket.write(`Content-Length: ${Buffer.byteLength(error)}\r\n`);
      socket.write('Connection: close\r\n');
      socket.write(error);
      socket.end();
    }
  });

  return app;
};

module.exports = createServer;