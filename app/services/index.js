const Slack      = require('node-slack');
const TestRunner = require('./test-runner');
const Scheduler  = require('./scheduler');
const reporter   = require('./reporter');
const History    = require('./history');
const config     = require('../../config');

const history    = new History(config.elasticsearch.host);
const slack      = (config.slack) ? new Slack(config.slack.url) : null;
const testRunner = new TestRunner(reporter, slack, history);
const scheduler  = new Scheduler(testRunner);

module.exports = {
  history:    history,
  testRunner: testRunner,
  scheduler:  scheduler
};