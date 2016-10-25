/*eslint no-magic-numbers: "off" */
const Scheduler = require('../../services/scheduler');
const utils     = require('../../../utils');

module.exports = function(services) {
  const self = this;

  self.getSchedules = (req, res)=> {
    res.status(200).json(services.scheduler.getAll());
  };

  self.addSchedule = (req, res)=> {
    if (!Scheduler.NAME_REGEX.test(req.body.name)) {
      res.status(400).json({error: 'schedule name must have alphanumeric characters only'});
      return;
    }

    try {
      services.scheduler.add(req.body.name, req.body.schedule);
      res.status(201).json();
    } catch (ex) {
      utils.processError(ex, res);
    }
  };

  self.getSchedule = (req, res)=> {
    const id = req.params.id;

    if (!Scheduler.NAME_REGEX.test(id)) {
      res.status(400).json({error: 'schedule name must have alphanumeric characters only'});
      return;
    }

    try {
      res.status(200).json(services.scheduler.get(id));
    } catch (ex) {
      utils.processError(ex, res);
    }
  };

  self.updateSchedule = (req, res)=> {
    const id = req.params.id;

    if (!Scheduler.NAME_REGEX.test(id)) {
      res.status(400).json({error: 'schedule name must have alphanumeric characters only'});
      return;
    }

    try {
      services.scheduler.update(id, req.body.schedule);
      res.status(201).json();
    } catch (ex) {
      utils.processError(ex, res);
    }
  };

  self.deleteSchedule = (req, res)=> {
    const id = req.params.id;

    if (!Scheduler.NAME_REGEX.test(id)) {
      res.status(400).json({error: 'schedule name must have alphanumeric characters only'});
      return;
    }

    try {
      services.scheduler.delete(id);
      res.status(204).json();
    } catch (ex) {
      utils.processError(ex, res);
    }
  };

  self.deleteSchedules = (req, res)=> {
    try {
      services.scheduler.deleteAll();
      res.status(204).json();
    } catch (ex) {
      utils.processError(ex, res);
    }
  };

  self.startScheduler = (req, res) => {
    try {
      services.scheduler.start();
      res.status(200).json({message: 'started'});
    } catch (ex) {
      utils.processError(ex, res);
    }
  };

  self.stopScheduler = (req, res) => {
    try {
      services.scheduler.stop();
      res.status(200).json({message: 'stopped'});
    } catch (ex) {
      utils.processError(ex, res);
    }
  };

  return self;
};