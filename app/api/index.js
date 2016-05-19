const express    = require('express');
const router     = express.Router();
const results    = require('./results');
const schedules  = require('./schedules');
const controller = require('./root.controller');

module.exports = () => {
  router.get('/status', controller.getStatus);

  router.use('/results', results());
  router.use('/schedules', schedules());
  return router;
};