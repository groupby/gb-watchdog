/*eslint no-magic-numbers: "off" */
const services  = require('../../services');
const Scheduler = require('../../services/scheduler');
const utils     = require('../../../utils');

const getSchedules = (req, res)=> {
  res.status(200).json(services.scheduler.getAll());
};

const addSchedule = (req, res)=> {
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

const getSchedule = (req, res)=> {
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

const updateSchedule = (req, res)=> {
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

const deleteSchedule = (req, res)=> {
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

const deleteSchedules = (req, res)=> {
  try {
    services.scheduler.deleteAll();
    res.status(204).json();
  } catch (ex) {
    utils.processError(ex, res);
  }
};

const startScheduler = (req, res) => {
  try {
    services.scheduler.start();
    res.status(200).json({message: 'started'});
  } catch (ex) {
    utils.processError(ex, res);
  }
};

const stopScheduler = (req, res) => {
  try {
    services.scheduler.stop();
    res.status(200).json({message: 'stopped'});
  } catch (ex) {
    utils.processError(ex, res);
  }
};

module.exports = {
  getSchedules:   getSchedules,
  addSchedule:    addSchedule,
  getSchedule:    getSchedule,
  updateSchedule: updateSchedule,
  deleteSchedule: deleteSchedule,
  deleteSchedules: deleteSchedules,
  startScheduler: startScheduler,
  stopScheduler:  stopScheduler
};