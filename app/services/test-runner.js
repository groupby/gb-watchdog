const _       = require('lodash');
const config  = require('../../config');
const log     = config.log;
const moment  = require('moment');
const freshy = require('freshy');
require('moment-duration-format');

const MOMENT_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';

const randomString = (length, chars) => {
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

const detailIndicator = /test failed due to:/i;

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

        let text        = '\n';
        let detailsText = '\n';

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
          const failedTests = _.filter(result.tests, (test) => _.has(test, 'error'));
          text += 'Some test failures:\n';
          failedTests.forEach((test) => {
            const reference = randomString(5, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
            
            // Chai prepends any custom assert error message. It ends up looking like this:
            // 'something bad happened: expect 42 to be 43'
            // This splits it by colon. If the error didn't come from Chai from our unit tests,
            // we display just the plain error message. If it did come from Chai, we display the
            // error as the 'error' and our custom description of why the test failed as 'desc'.
            const errorPieces = test.error.split(':');

            text += `\n\tname:  ${test.name}\n`;
            text += `\terror:  ${errorPieces[1] ? errorPieces[1] : errorPieces[0]}\n`;
            text += `\tdesc:  ${errorPieces[1] ? errorPieces[0] : 'Error not from assertion, no description available.'}\n`;
            text += `\treference:  ${reference}\n`;

            if (_.isString(test.error) && test.error.match(detailIndicator)) {
              detailsText += `Reference: ${reference}\n\tDetails:    ${test.error}\n`;
            }
          });

        }

        services.slack.send({
          text:     text,
          channel:  services.slackConfig.channel,
          username: services.slackConfig.username
        });

        if (detailsText.match(detailIndicator) && services.slackConfig.detailsChannel) {
          services.slack.send({
            text:     detailsText,
            channel:  services.slackConfig.detailsChannel,
            username: services.slackConfig.username
          });
        }
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

  const clearMochaCache = () => {
    Object.keys(require.cache).forEach(function (key) {
      if(key.includes('gb-watchdog/tests/fakeE2ETests/')) {
        delete require.cache[key];
      }
    });
  };

  self.run = (name, files) => {
    if (!mochaRunner[name]) {
      log.debug(`Running schedule '${name}' with files: ${files}`);

      // Need to clear it out of the module cache because mocha keeps a global variable tracking test state
      const Mocha = freshy.reload('mocha');
      const mocha = new Mocha();
      clearMochaCache();

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
