const express    = require('express');
const router     = express.Router();
const controller = require('./results.controller');

router.get('/', controller.getResults);
router.post('/', controller.getResults);

module.exports = function () {
  return router;
};