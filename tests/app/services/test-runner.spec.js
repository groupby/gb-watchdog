/*eslint no-invalid-this: "off" */
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;
const moment         = require('moment');

const config = require('../../../config');
const log    = config.log;

log.level('debug');

const TestRunner = require('../../../app/services/test-runner');

chai.use(chaiAsPromised);

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
      testRunner.abort();
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
    testRunner.abort();
  });

  it.only('should report status at end via slack', (done) => {
    let passes  = 0;
    let fails   = 0;
    let end     = 0;
    let options = null;

    const slack = {
      send: (message) => {
        expect(message.text).to.match(/noopTest/);
        testRunner.abort();
        done();
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

    const testRunner = new TestRunner({
      reporter, slack, slackConfig: {
        username: 'user',
        channel:  'channel'
      }
    });
    testRunner.run('default', ['tests/fakeE2ETests/noopTest.js']);
  });

  it('should report status at end via sysdig', (done) => {
    let passes  = 0;
    let fails   = 0;
    let end     = 0;
    let options = null;

    const sysdigConfig = {
      apiKey: 'token',
      alert:  {
        namespace:   'namespace',
        severity:    'severity',
        tags:        {
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
        testRunner.abort();
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
});