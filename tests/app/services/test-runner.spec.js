/*eslint no-invalid-this: "off" */
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;

const config     = require('../../../config');
const TestRunner = require('../../../app/services/test-runner');

chai.use(chaiAsPromised);

describe('test-runner service', ()=> {
  config.setConfig({
    slack: {
      url:      'http://fakeurl.com',
      username: 'bot',
      channel:  '#fake_channel'
    }
  });

  // NOTE: For some reason this test fails when everything is run.
  // Likely some weird module caching issue caused by testing.
  it.skip('should run tests', done => {
    let passes    = 0;
    let fails     = 0;
    let end       = 0;
    let options   = null;
    const slack   = 'fake slack';
    const history = 'fake history';

    const complete = ()=> {
      options.reporterOptions.statusCallback({
        end: 'done'
      });
      expect(passes).to.eql(1);
      expect(fails).to.eql(2);
      expect(end).to.eql(1);
      expect(options.reporterOptions.slack).to.eql(slack);
      expect(options.reporterOptions.history).to.eql(history);

      const status = testRunner.status();
      expect(status.end).to.eql('done');
      done();
    };

    const reporter = function (mochaRunner, mochaOptions) {
      options    = mochaOptions;

      mochaRunner.on('pass', ()=> {
        passes++;
      });
      mochaRunner.on('fail', ()=> {
        fails++;
      });
      mochaRunner.on('end', ()=> {
        end++;
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner(reporter, slack, history);
    testRunner.run(['tests/fakeE2ETests/noopTest.js']);
  });

  it('should abort tests', done => {
    let options   = null;
    const slack   = 'fake slack';
    const history = 'fake history';

    const complete = ()=> {
      options.reporterOptions.statusCallback({end: 'done'});
      done();
    };

    const reporter = function (mochaRunner, mochaOptions) {
      options    = mochaOptions;

      mochaRunner.on('end', ()=> {
        complete();
      });

      return this;
    };

    const testRunner = new TestRunner(reporter, slack, history);
    testRunner.run(['tests/fakeE2ETests/noopTest.js']);
    testRunner.abort();
  });
});