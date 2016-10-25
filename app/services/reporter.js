const _      = require('lodash');
const moment = require('moment');

const MOMENT_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';

const reporter = function (runner, options) {
  const result = {
    total:      runner.total,
    passes:     0,
    fails:      0,
    incomplete: runner.total,
    duration:   0,
    start:      moment().toISOString(),
    end:        null,
    schedule:   options.reporterOptions.schedule,
    tests:      []
  };

  const updateStatus = (status)=> {
    if (_.isFunction(options.reporterOptions.statusCallback)) {
      options.reporterOptions.statusCallback(status);
    }
  };

  runner.on('pass', (test) => {
    result.passes++;
    result.incomplete--;
    result.tests.push({
      name:     test.fullTitle(),
      duration: test.duration
    });

    updateStatus(result);
  });

  runner.on('fail', (test, error) => {
    result.fails++;
    result.incomplete--;
    result.tests.push({
      name:     test.fullTitle(),
      duration: test.duration,
      error:    error.message,
      stack:    error.stack
    });

    updateStatus(result);
  });

  runner.on('end', () => {
    result.end      = moment().toISOString();
    result.duration = moment.duration(moment(result.end).diff(moment(result.start))).asMilliseconds();

    updateStatus(result);
  });

  return this;
};

module.exports = reporter;
