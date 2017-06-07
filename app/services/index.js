const Slack      = require('node-slack');
const TestRunner = require('./test-runner');
const Scheduler  = require('./scheduler');
const reporter   = require('./reporter');
const History    = require('./history');
const BlipClient = require('blip-client');
const Sysdig     = require('./sysdig');

// const log = require('../../config').log;

module.exports = function (config) {
  const elasticsearch = require('../../config/elasticsearch')((config.elasticsearch && config.elasticsearch.logLevel) || 'warn');

  const blipClient = (config.blipServer) ? BlipClient.createClient(config.blipServer.host, config.blipServer.port, config.blipServer.serviceName, config.blipServer.environment) : null;

  const esClient = (config.elasticsearch) ? elasticsearch.createClient(config.elasticsearch.host, config.elasticsearch.apiVersion) : null;
  // const esClient = (config.elasticsearch) ? elasticsearch.createClient('es-new', '9200', config.elasticsearch.apiVersion) : null;

  const history = new History(esClient, config.elasticsearch && config.elasticsearch.indexSuffix);
  const slack   = config.slack ? new Slack(config.slack.url) : null;
  const sysdig  = config.sysdig ? new Sysdig(config.sysdig.apiKey) : null;

  const testRunner = new TestRunner({reporter, slack, slackConfig: config.slack, history, blipClient, sysdig, sysdigConfig: config.sysdig});
  const scheduler  = new Scheduler(testRunner);

  return {
    history:    history,
    testRunner: testRunner,
    scheduler:  scheduler
  };
};
