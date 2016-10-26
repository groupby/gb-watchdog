const express    = require('express');
const Controller = require('./schedules.controller');

module.exports = function (services) {
  const controller = new Controller(services);
  const router     = express.Router();
  router.get('/', controller.getSchedules);
  router.post('/', controller.addSchedule);
  router.delete('/', controller.deleteSchedules);
  router.post('/_start', controller.startScheduler);
  router.post('/_stop', controller.stopScheduler);

  router.get('/:id', controller.getSchedule);
  router.put('/:id', controller.updateSchedule);
  router.delete('/:id', controller.deleteSchedule);

  return router;
};