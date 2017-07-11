const _       = require('lodash');
const config  = require('../../config');
const log     = config.log;
const moment  = require('moment');
const decache = require('decache');
require('moment-duration-format');

const MOMENT_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';

const TestRunner = function (services) {
  const self        = this;
  const mochaRunner = {};
  const curStatus   = {};

  if (_.isObject(services.slack) && !_.isFunction(services.slack.send)) {
    throw new Error('if provided, slack must have a send function');
  }

  if (_.isObject(services.slack) && !_.isObject(services.slackConfig)) {
    throw new Error('if slack is provided, must have slackConfig');
  }

  if (_.isObject(services.sysdig) && !_.isFunction(services.sysdig.sendEvent)) {
    throw new Error('if provided, sysdig must have a sendEvent function');
  }

  if (_.isObject(services.sysdig) && !_.isObject(services.sysdigConfig)) {
    throw new Error('if sysdig is provided, must have sysdigConfig');
  }

  if (_.isObject(services.history) && !_.isFunction(services.history.addResult)) {
    throw new Error('if provided, history must have a addResult function');
  }

  if (_.isObject(services.blipClient) && !_.isFunction(services.blipClient.write)) {
    throw new Error('if provided, blipClient must have a write function');
  }

  const handleFinalResults = (result) => {
    log.debug('Logging final results');

    if (services.slack) {
      if (result.fails > 0) {

        let text = '\n';

        if (services.slackConfig.verbose === true) {

          text += 'Test Results\n';
          text += '\n';
          text += `Schedule:   ${result.schedule.name}\n`;
          text += `Files:      ${result.schedule.files}\n`;
          text += '\n';
          text += `Start:      ${moment(result.start).format(MOMENT_FORMAT)}\n`;
          text += `End:        ${moment(result.end).format(MOMENT_FORMAT)}\n`;
          text += `Duration:   ${moment.duration(result.duration).format('d[d] h:mm:ss')}\n`;
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

        } else {
          text += 'Some test failures:\n' + result.tests.filter(test => {
                return _.has(test, "error");
              }).map(test => `\tname:    ${test.name}`).join('\n');
        }

        services.slack.send({
          text:     text,
          channel:  services.slackConfig.channel,
          username: services.slackConfig.username
        });
      }
    }

    if (result.fails > 0 && _.isObject(services.sysdig)) {
      const alert = services.sysdigConfig.alert;

      let description = '';
      result.tests.forEach((test) => {
        if (test.error) {
          description += '\n\n';
          description += `Test:    ${test.name}\n`;
          description += `Msg:     ${test.error}\n`;
        }
      });

      services.sysdig.sendEvent(result.schedule.name, description, alert.severity, alert.namespace, Object.assign({}, alert.tags, {
        testName: result.schedule.name
      }));
    }

    if (_.isObject(services.history)) {
      services.history.addResult(result);
    }

    if (_.isObject(services.blipClient)) {
      services.blipClient.write(result);
    }
  };

  const statusCallback = (update) => {
    curStatus[update.schedule.name] = update;

    if (update.fails > 0) {
      const error = `Failed test: ${update.schedule.name} \n with results: ${JSON.stringify(update, null, 2)}`;
      log.error(error);
    } else {
      log.debug(`Status update for ${update.schedule.name}: `, JSON.stringify(update, null, 2));
    }

    // If the previous run is complete, remove reference to mochaRunner
    if (update.end !== null) {
      handleFinalResults(update);
      delete mochaRunner[update.schedule.name];
    }
  };

  self.run = (name, files) => {
    if (!mochaRunner[name]) {
      log.debug(`Running schedule '${name}' with files: ${files}`);

      // Need to clear it out of the module cache because mocha keeps a global variable tracking test state
      decache('mocha');
      const Mocha = require('mocha');
      const mocha = new Mocha();
      mocha.reporter(services.reporter, {
        schedule:       {
          name:  name,
          files: files
        },
        statusCallback: statusCallback
      });

      _.forEach(files, (file) => mocha.addFile(file));
      mochaRunner[name] = mocha.run();

      // Attempt to address mocha memory leaks
      mochaRunner[name].on('suite end', function (suite) {
        log.debug('deleting mocha suite');
        delete suite.tests;
        delete suite._beforeAll;
        delete suite._beforeEach;
        delete suite._afterEach;
        delete suite.ctx;
        delete suite._afterAll;
        delete mochaRunner[name];
      });
    } else {
      const error = `Already running test for schedule '${name}, skipping this run'`;
      log.error(error);
      self.logSlackError(error);
    }
  };

  self.abort = (name) => {
    if (!mochaRunner[name]) {
      const error = `Cannot abort testing of '${name}', tests not running`;
      log.error(error);
      self.logSlackError(error);
    } else {
      log.info(`Aborted testing for '${name}'`);
      mochaRunner[name].abort();
      delete mochaRunner[name];
    }
  };

  self.status = () => {
    return curStatus;
  };

  self.logSlackError = (message) => {
    if (services.slack && services.slackConfig) {
      services.slack.send({
        text:     message,
        channel:  services.slackConfig.channel,
        username: services.slackConfig.username
      });
    }
  };

  return self;
};

module.exports = TestRunner;
