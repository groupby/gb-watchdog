const _      = require('lodash');
const moment = require('moment');
require("moment-duration-format");

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
    result.end      = moment();
    result.duration = moment.duration(result.end.diff(moment(result.start)));

    if (options.reporterOptions.slack) {
      if (result.fails > 0) {

        let text = '\n';
        text += 'Test Results\n';
        text += '\n';
        text += `Schedule:   ${result.schedule.name}\n`;
        text += `Files:      ${result.schedule.files}\n`;
        text += '\n';
        text += `Start:      ${moment(result.start).format(MOMENT_FORMAT)}\n`;
        text += `End:        ${result.end.format(MOMENT_FORMAT)}\n`;
        text += `Duration:   ${result.duration.format("d[d] h:mm:ss")}\n`;
        text += '\n';
        text += `Passes:     ${result.passes}\n`;
        text += `Failures:   ${result.fails}\n`;
        text += `Incomplete: ${result.incomplete}`;
        text += '\n\n';
        text += 'Errors:';
        result.tests.forEach(test => {
          if (test.error) {
            text += '\n\n';
            text += `Test:    ${test.name}\n`;
            text += `Msg:     ${test.error}\n`;
            text += `Stack:   ${test.stack}`;
          }
        });

        options.reporterOptions.slack.send({
          text:     text,
          channel:  options.reporterOptions.channel,
          username: options.reporterOptions.username
        });
      }
    }

    result.end      = result.end.toISOString();
    result.duration = result.duration.asMilliseconds();

    if (options.reporterOptions.history) {
      options.reporterOptions.history.addResult(result);
    }

    updateStatus(result);
  });

  return this;
};

module.exports = reporter;
