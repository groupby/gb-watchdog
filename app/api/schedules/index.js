const express    = require('express');
const router     = express.Router();
const controller = require('./schedules.controller');

router.get('/', controller.getSchedules);
router.post('/', controller.addSchedule);
router.delete('/', controller.deleteSchedules);
router.post('/_start', controller.startScheduler);
router.post('/_stop', controller.stopScheduler);

router.get('/:id', controller.getSchedule);
router.put('/:id', controller.updateSchedule);
router.delete('/:id', controller.deleteSchedule);

module.exports = function () {
  return router;
};