/*eslint no-magic-numbers: "off" */
/*eslint no-unused-vars: ["error", { "args": "none" }]*/
const _              = require('lodash');
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;
const moment         = require('moment');

const config    = require('../../../config');
const Schedule  = require('../../../app/models/schedule');
const Scheduler = require('../../../app/services/scheduler');
const TestRunner = require('../../../app/services/test-runner');

chai.use(chaiAsPromised);

describe('scheduler service', () => {
  let options = null;

  const Slack = function () {
    const self       = this;
    self.numMessages = 0;
    self.send        = (message) => {}
  };
  const slack = new Slack();

  const complete = () => {
    options.reporterOptions.statusCallback({
      start:    moment().subtract(1, 'day').toISOString(),
      duration: 10,
      end:      moment().toISOString(),
      fails:    1,
      tests:    [],
      schedule: {
        name:  'default',
        files: ['tests/fakeE2ETests/explodingTest.js']
      }
    });

  };

  const reporter = function (mochaRunner, mochaOptions) {
    options = mochaOptions;
    mochaRunner.on('end', () => complete());
    return this;
  };

  let scheduler      = null;

  afterEach(() => {
    try {
      scheduler.stop();
    } catch (ex) {
      log.error('probably bad things happened');
      // Do nothing
    }
  });

  it('should not retry a test once that test fails', (done) => {
    const testRunner = new TestRunner({
      reporter, slack, slackConfig: {
        username: 'user',
        channel:  'channel'
      }
    });

    scheduler      = new Scheduler(testRunner);
    let schedules = scheduler.getAll();

    scheduler.start();
    expect(_.size(schedules)).to.eql(0);

    schedules = scheduler.getAll();

    expect(_.size(schedules)).to.eql(2);
    const status = scheduler.status();
    expect(status.schedules.default.prevRun).to.eql('never');
    expect(moment(status.schedules.default.nextRun).valueOf()).to.be.above(new Date().valueOf());
    setTimeout(done, 9000);
  }).timeout(10000);
});