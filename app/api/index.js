const express    = require('express');
const results    = require('./results');
const schedules  = require('./schedules');
const Controller = require('./root.controller');

module.exports = function(services) {
  const router     = express.Router();
  const controller = new Controller(services);
  router.get('/status', controller.getStatus);
  router.get('/health', controller.getHealth);

  router.use('/results', results(services));
  router.use('/schedules', schedules(services));
  return router;
};