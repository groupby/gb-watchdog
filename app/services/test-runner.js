const _       = require('lodash');
const config  = require('../../config');
const decache = require('decache');

const TestRunner = function (reporter, slack, history) {
  const log       = config.log;
  const self      = this;
  let mochaRunner = {};
  let curStatus   = {};

  const statusCallback = (update) => {
    curStatus[update.schedule.name] = update;

    if (update.fails > 0) {
      log.error(`Failed test: ${update.schedule.name} \n with results: ${JSON.stringify(update, null, 2)}`);
    } else {
      log.debug(`Status update for ${update.schedule.name}: `, JSON.stringify(update, null, 2));
    }

    // If the previous run is complete, remove reference to mochaRunner
    if (update.end !== null) {
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
        username:       (config.slack) ? config.slack.username : null,
        channel:        (config.slack) ? config.slack.channel : null,
        slack:          slack,
        statusCallback: statusCallback,
        history:        history
      });

      _.forEach(files, file => mocha.addFile(file));
      mochaRunner[name] = mocha.run();
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