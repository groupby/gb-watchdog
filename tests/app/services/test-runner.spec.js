/*eslint no-invalid-this: "off" */
const chai   = require('chai');
const expect = chai.expect;
const moment = require('moment');

const config = require('../../../config');
const log    = config.log;

log.level('debug');

const TestRunner = require('../../../app/services/test-runner');

describe('test-runner service', () => {
  it('should run tests', (done) => {
    let passes    = 0;
    let fails     = 0;
    let end       = 0;
    let options   = null;
    const slack   = 'fake slack';
    const history = 'fake history';

    const complete = () => {
      options.reporterOptions.statusCallback({
        end:      'done',
        schedule: {
          name:  'default',
          files: ['tests/fakeE2ETests/noopTest.js']
        }
      });
      expect(passes).to.eql(1);
      expect(fails).to.eql(2);
      expect(end).to.eql(1);

      const status = testRunner.status();
      expect(status['default'].end).to.eql('done');
      expect(status['default'].schedule.name).to.eql('default');
      expect(status['default'].schedule.files).to.eql(['tests/fakeE2ETests/noopTest.js']);
      testRunner.abort('default');
      done();
    };

    const reporter = function (mochaRunner, mochaOptions) {
      options = mochaOptions;

      mochaRunner.on('pass', () => {
        passes++;
      });
      mochaRunner.on('fail', () => {
        fails++;
      });
      mochaRunner.on('end', () => {
        end++;
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner({reporter, slack, history});
    testRunner.run('default', ['tests/fakeE2ETests/noopTest.js']);
  });

  it('should abort tests', (done) => {
    let options   = null;
    const slack   = 'fake slack';
    const history = 'fake history';

    const complete = () => {
      options.reporterOptions.statusCallback({
        end:      'done',
        schedule: {
          name:  'default',
          files: ['tests/fakeE2ETests/noopTest.js']
        }
      });
      done();
    };

    const reporter = function (mochaRunner, mochaOptions) {
      options = mochaOptions;

      mochaRunner.on('end', () => {
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner({reporter, slack, history});
    testRunner.run('default', ['tests/fakeE2ETests/noopTest.js']);
    testRunner.abort('default');
  });

  it('should report status at end via slack', (done) => {
    let passes  = 0;
    let fails   = 0;
    let end     = 0;
    let options = null;

    const slack = {
      send: (message) => {
        if (message.text.match(/Test Results/) && message.text.match(/noopTest/)) {

          expect(passes).to.eql(1);
          expect(fails).to.eql(2);
          expect(end).to.eql(1);
          expect(status['default'].end).to.exist;
          expect(status['default'].schedule.name).to.eql('default');
          expect(status['default'].schedule.files).to.eql(['tests/fakeE2ETests/noopTest.js']);

          testRunner.abort('default');
          done();
        }
      }
    };

    const complete = () => {
      options.reporterOptions.statusCallback({
        start:    moment().subtract(1, 'day').toISOString(),
        duration: 10,
        end:      moment().toISOString(),
        fails:    10,
        tests:    [],
        schedule: {
          name:  'default',
          files: ['tests/fakeE2ETests/noopTest.js']
        }
      });

    };

    const reporter = function (mochaRunner, mochaOptions) {
      options = mochaOptions;

      mochaRunner.on('pass', () => {
        passes++;
      });
      mochaRunner.on('fail', () => {
        fails++;
      });
      mochaRunner.on('end', () => {
        end++;
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner({
      reporter, slack, slackConfig: {
        username: 'user',
        channel:  'channel',
        verbose:  true
      }
    });

    const status = testRunner.status();
    testRunner.run('default', ['tests/fakeE2ETests/noopTest.js']);
  });

  it('should report details to detail channel', (done) => {
    const reporter = require('../../../app/services/reporter');
    const slack = {
      send: (message) => {
        if (message.text.match(/Reference/) && message.text.match(/Details/)) {
          expect(message.text).to.match(/Details:    Test failed due to: being a bad test/);
          expect(message.channel).to.eql('detailsChannel');
          done();
        }
      }
    };

    const testRunner = new TestRunner({
      reporter, slack, slackConfig: {
        username:       'user',
        channel:        'channel',
        detailsChannel: 'detailsChannel',
        verbose:        false
      }
    });

    testRunner.run('default', ['tests/fakeE2ETests/detailsTest.js']);
  });

  it('should report status at end via sysdig', (done) => {
    let passes  = 0;
    let fails   = 0;
    let end     = 0;
    let options = null;

    const sysdigConfig = {
      apiKey: 'token',
      alert:  {
        namespace: 'namespace',
        severity:  'severity',
        tags:      {
          'tagOne': 'one'
        }
      }
    };

    const sysdig = {
      sendEvent: (name, description, severity, namespace, tags) => {
        expect(name).to.eql('defaultTest');
        expect(description).to.eql('');
        expect(namespace).to.eql(sysdigConfig.alert.namespace);
        expect(severity).to.eql(sysdigConfig.alert.severity);
        expect(tags).to.eql(Object.assign({}, sysdigConfig.alert.tags, {
          testName: 'defaultTest'
        }));
        testRunner.abort('default');
        done();
      }
    };

    const timeValue = moment().toISOString();

    const complete = () => {
      options.reporterOptions.statusCallback({
        start:    moment().subtract(1, 'day').toISOString(),
        duration: 10,
        end:      timeValue,
        fails:    10,
        tests:    [],
        schedule: {
          name:  'defaultTest',
          files: ['tests/fakeE2ETests/noopTest.js']
        }
      });
      expect(passes).to.eql(1);
      expect(fails).to.eql(2);
      expect(end).to.eql(1);

      const status = testRunner.status();
      expect(status['default'].end).to.eql(timeValue);
      expect(status['default'].schedule.name).to.eql('default');
      expect(status['default'].schedule.files).to.eql(['tests/fakeE2ETests/noopTest.js']);
    };

    const reporter = function (mochaRunner, mochaOptions) {
      options = mochaOptions;

      mochaRunner.on('pass', () => {
        passes++;
      });
      mochaRunner.on('fail', () => {
        fails++;
      });
      mochaRunner.on('end', () => {
        end++;
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner({
      reporter, sysdig, sysdigConfig
    });
    testRunner.run('default', ['tests/fakeE2ETests/noopTest.js']);
  });

  it('should update status via history', (done) => {
    let passes  = 0;
    let fails   = 0;
    let end     = 0;
    let options = null;

    const complete = () => {
      options.reporterOptions.statusCallback({
        start:    moment().subtract(1, 'day').toISOString(),
        duration: 10,
        end:      moment().toISOString(),
        fails:    10,
        tests:    [],
        schedule: {
          name:  'default',
          files: ['tests/fakeE2ETests/noopTest.js']
        }
      });
      expect(passes).to.eql(1);
      expect(fails).to.eql(2);
      expect(end).to.eql(1);

      const status = testRunner.status();
      expect(status['default'].end).to.eql('done');
      expect(status['default'].schedule.name).to.eql('default');
      expect(status['default'].schedule.files).to.eql(['tests/fakeE2ETests/noopTest.js']);
    };

    const reporter = function (mochaRunner, mochaOptions) {
      options = mochaOptions;

      mochaRunner.on('pass', () => {
        passes++;
      });
      mochaRunner.on('fail', () => {
        fails++;
      });
      mochaRunner.on('end', () => {
        end++;
        complete();
      });

      return this;
    };

    const historySent = [];
    const mockHistory = {
      addResult: (result) => {
        historySent.push(result);

        if (end > 0) {
          expect(historySent.length).to.eql(1);
          expect(result.schedule.name).to.eql('default');
          done();
        }
      }
    };

    const testRunner = new TestRunner({reporter, slack: null, slackConfig: null, history: mockHistory});
    testRunner.run('default', ['tests/fakeE2ETests/noopTest.js']);
  });

  it('should recover if test explodes', (done) => {
    let options = null;

    const Slack = function () {
      const self       = this;
      self.numMessages = 0;
      self.send        = (message) => {
        if (message.text.match(/Test Results/) && message.text.match(/explodingTest/)) {
          self.numMessages++;
          if (self.numMessages === 1) {
            testRunner.run('default', ['tests/fakeE2ETests/explodingTest.js']);
          } else {
            done();
          }
        }
      }
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

    const testRunner = new TestRunner({
      reporter, slack, slackConfig: {
        username: 'user',
        channel:  'channel',
        verbose:  true
      }
    });

    testRunner.run('default', ['tests/fakeE2ETests/explodingTest.js']);
  });

  it('should send error through slack', (done) => {
    const slackConfig = {
      channel:  'testChannel',
      username: 'testUser',
      verbose:  true
    };
    const services    = {
      slack: {
        send: (params) => {
          expect(params.text).to.eql('test message');
          expect(params.channel).to.eql(slackConfig.channel);
          expect(params.username).to.eql(slackConfig.username);
          done();
        }
      },
      slackConfig
    };
    const testRunner  = new TestRunner(services);
    testRunner.logSlackError('test message');
  });

  it('should print slack verbose messages', (done) => {
    let passes  = 0;
    let fails   = 0;
    let end     = 0;
    let options = null;

    const slack = {
      send: (message) => {
        if (message.text.match(/Test Results/) && message.text.match(/noopTest/)) {

          expect(passes).to.eql(1);
          expect(fails).to.eql(2);
          expect(end).to.eql(1);
          expect(status['default'].end).to.exist;
          expect(status['default'].schedule.name).to.eql('default');
          expect(status['default'].schedule.files).to.eql(['tests/fakeE2ETests/noopTest.js']);

          testRunner.abort('default');
          done();
        }
      }
    };

    const complete = () => {
      options.reporterOptions.statusCallback({
        start:    moment().subtract(1, 'day').toISOString(),
        duration: 10,
        end:      moment().toISOString(),
        fails:    10,
        tests:    [],
        schedule: {
          name:  'default',
          files: ['tests/fakeE2ETests/noopTest.js']
        }
      });

    };

    const reporter = function (mochaRunner, mochaOptions) {
      options = mochaOptions;

      mochaRunner.on('pass', () => {
        passes++;
      });
      mochaRunner.on('fail', () => {
        fails++;
      });
      mochaRunner.on('end', () => {
        end++;
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner({
      reporter, slack, slackConfig: {
        username: 'user',
        channel:  'channel',
        verbose:  true
      }
    });

    const status = testRunner.status();
    testRunner.run('default', ['tests/fakeE2ETests/noopTest.js']);
  });

  it('should print slack silent messages on failure of tests', (done) => {
    let options = null;

    const slack = {
      send: (message) => {
        if (message.text.match(/Some test failure/)) {
          expect(message.text).to.match(/noop test 2/);
          expect(message.text).to.match(/noop test 3/);
          done();
        } else {
          done('fail because no match')
        }
      }
    };

    const complete = () => {
      options.reporterOptions.statusCallback({
        start:    moment().subtract(1, 'day').toISOString(),
        duration: 10,
        end:      moment().toISOString(),
        fails:    10,
        tests:    [{name: 'noop test 1'}, {name: 'noop test 2', error: 'some error'}, {name: 'noop test 3', 'error': 'some error'}],
        schedule: {
          name:  'default',
          files: ['tests/fakeE2ETests/noopTest.js']
        }
      });
    };

    const reporter = function (mochaRunner, mochaOptions) {
      options = mochaOptions;

      mochaRunner.on('pass', () => {
      });
      mochaRunner.on('fail', () => {
      });
      mochaRunner.on('end', () => {
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner({
      reporter, slack, slackConfig: {
        username: 'user',
        channel:  'channel',
        verbose:  false
      }
    });

    testRunner.run('default', ['tests/fakeE2ETests/noopTest.js']);
  });

  it('should print only failed tests when suite fails', (done) => {
    let passes  = 0;
    let fails   = 0;
    let end     = 0;
    let options = null;

    const slack = {
      send: (message) => {
        if (message.text.match(/Some test failures/)) {
          expect(passes).to.eql(3);
          expect(fails).to.eql(1);
          expect(end).to.eql(1);

          expect(message.text).contains('novica');
          expect(message.text).not.contains('systemax');
          expect(message.text).not.contains('anthropologie');
          expect(message.text).not.contains('austinkayak');

          done();
        }

      }
    };

    const complete = () => {
      options.reporterOptions.statusCallback({
        start:    moment().subtract(1, 'day').toISOString(),
        duration: 10,
        end:      moment().toISOString(),
        fails:    10,
        tests:    [{name: 'anthropologie assert test'},
          {name: 'systemax assert test'},
          {name: 'novica assert test', 'duration': 565, error: 'some error'},
          {name: 'austinkayak assert test'}],
        schedule: {
          name:  'default',
          files: ['tests/fakeE2ETests/onlyOneTestFails.js']
        }
      });

    };

    const reporter = function (mochaRunner, mochaOptions) {
      options = mochaOptions;

      mochaRunner.on('pass', () => {
        passes++;
      });
      mochaRunner.on('fail', () => {
        fails++;
      });
      mochaRunner.on('end', () => {
        end++;
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner({
      reporter, slack, slackConfig: {
        username: 'user',
        channel:  'channel',
        verbose:  false
      }
    });

    testRunner.run('default', ['tests/fakeE2ETests/onlyOneTestFails.js']);
  }).timeout(10000);

});