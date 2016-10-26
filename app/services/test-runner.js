const _       = require('lodash');
const config  = require('../../config');
const log = config.log;
const moment = require('moment');
require("moment-duration-format");
const decache = require('decache');

const MOMENT_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';

const TestRunner = function (reporter, slack, slackConfig, history, blipClient) {
  const self      = this;
  const mochaRunner = {};
  const curStatus   = {};

  if (_.isObject(slack) && !_.isFunction(slack.send)){
    throw new Error('if provided, slack must have a send function');
  }

  if (_.isObject(history) && !_.isFunction(history.addResult)){
    throw new Error('if provided, history must have a addResult function');
  }

  if (_.isObject(blipClient) && !_.isFunction(blipClient.write)){
    throw new Error('if provided, blipClient must have a write function');
  }

  const handleFinalResults = (result) => {
    log.debug('Logging final results');

    if (slack) {
      if (result.fails > 0) {

        let text = '\n';
        text += 'Test Results\n';
        text += '\n';
        text += `Schedule:   ${result.schedule.name}\n`;
        text += `Files:      ${result.schedule.files}\n`;
        text += '\n';
        text += `Start:      ${moment(result.start).format(MOMENT_FORMAT)}\n`;
        text += `End:        ${moment(result.end).format(MOMENT_FORMAT)}\n`;
        text += `Duration:   ${moment.duration(result.duration).format("d[d] h:mm:ss")}\n`;
        text += '\n';
        text += `Passes:     ${result.passes}\n`;
        text += `Failures:   ${result.fails}\n`;
        text += `Incomplete: ${result.incomplete}`;
        text += '\n\n';
        text += 'Errors:';
        result.tests.forEach((test) => {
          if (test.error) {
            text += '\n\n';
            text += `Test:    ${test.name}\n`;
            text += `Msg:     ${test.error}\n`;
            text += `Stack:   ${test.stack}`;
          }
        });

        slack.send({
          text:     text,
          channel:  slackConfig.channel,
          username: slackConfig.username
        });
      }
    }

    if (history) {
      history.addResult(result);
    }

    if (blipClient) {
      blipClient.write(result);
    }
  };

  const statusCallback = (update) => {
    curStatus[update.schedule.name] = update;

    if (update.fails > 0) {
      log.error(`Failed test: ${update.schedule.name} \n with results: ${JSON.stringify(update, null, 2)}`);
    } else {
      log.debug(`Status update for ${update.schedule.name}: `, JSON.stringify(update, null, 2));
    }

    // If the previous run is complete, remove reference to mochaRunner
    if (update.end !== null) {
      handleFinalResults(update);
      delete mochaRunner[update.schedule.name]
    }
  };

  self.run = (name, files) => {
    if (!mochaRunner[name]) {
      log.debug(`Running schedule '${name}' with files: ${files}`);

      // Need to clear it out of the module cache because mocha keeps a global variable tracking test state
      decache('mocha');
      const Mocha = require('mocha');
      const mocha = new Mocha();
      mocha.reporter(reporter, {
        schedule:       {
          name:  name,
          files: files
        },
        statusCallback: statusCallback
      });

      _.forEach(files, (file) => mocha.addFile(file));
      mochaRunner[name] = mocha.run();

      // Attempt to address mocha memory leaks
      mochaRunner[name].on('suite end', function(suite) {
        log.debug('deleting mocha suite');
        delete suite.tests;
        delete suite._beforeAll;
        delete suite._beforeEach;
        delete suite._afterEach;
        delete suite.ctx;
        delete suite._afterAll;
      });
    } else {
      log.warn(`Already running test for schedule '${name}, skipping this run'`);
    }
  };

  self.abort = (name)=> {
    if (!mochaRunner[name]) {
      log.error(`Cannot abort testing of '${name}', tests not running`);
    } else {
      log.info(`Aborted testing for '${name}'`);
      mochaRunner[name].abort();
      delete mochaRunner[name];
    }
  };

  self.status = () => {
    return curStatus;
  };

  return self;
};

module.exports = TestRunner;