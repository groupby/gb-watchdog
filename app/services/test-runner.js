const _      = require('lodash');
const config = require('../../config');
const decache = require('decache');

const TestRunner = function (reporter, slack, history) {
  const log       = config.log;
  const self      = this;
  let mochaRunner = null;
  let curStatus   = 'Not yet run';

  const statusCallback = (update) => {
    curStatus = update;

    log.info('Status update: ', JSON.stringify(update, null, 2));

    // If the previous run is complete, remove reference to mochaRunner
    if (curStatus.end !== null) {
      mochaRunner = null;
    }
  };

  self.run = (files) => {
    log.info('Running test with files: ', JSON.stringify(files, null, 2));

    // Need to clear it out of the module cache because mocha keeps a global variable tracking test state
    decache('mocha');
    const Mocha     = require('mocha');
    const mocha = new Mocha();
    mocha.reporter(reporter, {
      username:       (config.slack) ? config.slack.username : null,
      channel:        (config.slack) ? config.slack.channel : null,
      slack:          slack,
      statusCallback: statusCallback,
      history:        history
    });

    _.forEach(files, file => mocha.addFile(file));
    mochaRunner = mocha.run();
  };

  self.abort = ()=> {
    if (mochaRunner === null) {
      log.error('Cannot abort testing, tests not running');
    } else {
      mochaRunner.abort();
    }
  };

  self.status = () => {
    return curStatus;
  };

  return self;
};

module.exports = TestRunner;