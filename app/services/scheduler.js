const _        = require('lodash');
const later    = require('later');
const moment   = require('moment');
const Schedule = require('../models/schedule');
const config   = require('../../config');
const log      = config.log;

const MSEC_IN_SEC    = 1000;
const STATUS_STOPPED = 'stopped';
const STATUS_RUNNING = 'running';

const Scheduler = function (testRunner) {
  const self = this;

  if (!_.isObject(testRunner) || !_.isFunction(testRunner.run) || testRunner.run.length < 1) {
    throw new Error(`testRunner must have 'run' function that takes at least one argument`);
  }

  let allSchedules     = {};
  let scheduleStatus   = {};
  let runningIntervals = {};
  let running          = false;

  self.add = (name, schedule) => {
    if (!_.isString(name) || !Scheduler.NAME_REGEX.test(name)) {
      throw new TypeError('name must be string of 1-40 alphanumeric characters');
    }

    if (allSchedules[name]) {
      throw new Error(`schedule '${name}' already exists`);
    }

    if (!(schedule instanceof Schedule)) {
      schedule = new Schedule(schedule);
    }

    log.info(`Adding schedule: ${name}`);

    allSchedules[name]   = schedule;
    scheduleStatus[name] = {
      prevRun: 'never'
    };

    updateStatus(name);
    if (running) {
      runningIntervals[name] = startInterval(name);
    }
  };

  self.update = (name, schedule) => {
    if (!_.isString(name) || !Scheduler.NAME_REGEX.test(name)) {
      throw new TypeError('name must be string of 1-40 alphanumeric characters');
    }

    if (!allSchedules[name]) {
      throw new Error(`schedule '${name}' does not exist`);
    }

    if (!(schedule instanceof Schedule)) {
      schedule = new Schedule(schedule)
    }

    log.info(`Updating schedule: ${name}`);

    allSchedules[name] = schedule;
    updateStatus(name);

    if (runningIntervals[name]) {
      runningIntervals[name].clear();
      delete runningIntervals[name];
      runningIntervals[name] = startInterval(name);
    }
  };

  self.delete = (name) => {
    if (!_.isString(name) || !Scheduler.NAME_REGEX.test(name)) {
      throw new TypeError('name must be string of 1-40 alphanumeric characters');
    }

    if (!allSchedules[name]) {
      throw new Error(`schedule '${name}' does not exist`);
    }

    log.info(`Deleting schedule: ${name}`);

    if (runningIntervals[name]) {
      runningIntervals[name].clear();
      delete runningIntervals[name];
    }

    delete allSchedules[name];
    delete scheduleStatus[name];
  };

  self.deleteAll = () => {
    log.info(`Deleting all schedules`);

    clearAllIntervals();
    allSchedules   = {};
    scheduleStatus = {};
  };

  self.get = (name) => {
    if (!_.isString(name) || !Scheduler.NAME_REGEX.test(name)) {
      throw new TypeError('name must be string of 1-40 alphanumeric characters');
    }

    if (!allSchedules[name]) {
      throw new Error(`schedule '${name}' does not exist`);
    }

    log.info(`Getting schedule: ${name}`);

    return _.cloneDeep(allSchedules[name]);
  };

  self.getAll = () => {
    return _.cloneDeep(allSchedules);
  };

  self.start = () => {
    if (!running) {
      log.info('Starting scheduler..');
      runningIntervals = _.reduce(allSchedules, (result, schedule, name) => {
        result[name] = startInterval(name);
        updateStatus(name);
        return result;
      }, {});

      running = true;
      log.info('Started');
    } else {
      const error = 'Cannot start, scheduler is already running';
      log.error(error);
      if (_.isFunction(testRunner.logSlackError)){
        testRunner.logSlackError(error);
      }
      throw new Error('Scheduler is already running');
    }
  };

  self.stop = () => {
    log.info('Stopping scheduler ..');
    clearAllIntervals();
    running = false;
    log.info('Stopped');
  };

  const clearAllIntervals = () => {
    log.debug(`Clearing all ${_.size(runningIntervals)} intervals`);
    _.map(runningIntervals, (interval, name) => {
      log.debug(`stopping ${name}`);
      testRunner.abort(name);
      scheduleStatus[name].nextRun = STATUS_STOPPED;
      interval.clear();
    });

    runningIntervals = {};
  };

  const updateStatus = (name) => {
    if (running) {
      // NOTE: This is a gross hack
      // Necessary because later.js may return now() as a response from next(1)
      // And times less than 1 second from now are ignored by later.js setInterval, so we should ignore them too
      const nextRuns               = later.schedule(allSchedules[name]).next(2);
      const withinOneSecond        = Math.abs(moment().valueOf() - moment(nextRuns[0]).valueOf()) < MSEC_IN_SEC;
      scheduleStatus[name].nextRun = withinOneSecond ? nextRuns[1] : nextRuns[0];
    } else {
      scheduleStatus[name].nextRun = STATUS_STOPPED;
    }
  };

  const startInterval = (name) => {
    return later.setInterval(() => {
      scheduleStatus[name].prevRun = moment().toISOString();
      log.debug(`Running schedule '${name} at ${scheduleStatus[name].prevRun}'`);
      testRunner.run(name, allSchedules[name].files);
      updateStatus(name);
    }, allSchedules[name]);
  };

  self.status = () => {
    return {
      state:     running ? STATUS_RUNNING : STATUS_STOPPED,
      schedules: _.cloneDeep(scheduleStatus)
    };
  };
};

Scheduler.NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9]{1,40}$/;

module.exports = Scheduler;