const express    = require('express');
const Controller = require('./results.controller');

module.exports = function (services) {
  const router     = express.Router();
  const controller = new Controller(services);
  router.get('/', controller.getResults);
  router.post('/', controller.getResults);
  return router;
};