/*eslint no-magic-numbers: "off" */
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;

const Reporter = require('../../../app/services/reporter');

chai.use(chaiAsPromised);

describe('reporter service', ()=> {


  it('should update status via callback', (done) => {
    const eventCallbacks = {};
    const mockRunner     = {
      total: 10,
      on:    (event, callback) => {
        eventCallbacks[event] = callback;
      }
    };

    let statusSent       = null;
    const statusCallback = (status)=> {
      statusSent = status;
    };

    const options = {
      reporterOptions: {
        statusCallback: statusCallback,
        schedule:   {
          name:  'default',
          files: ['sometest.js']
        }
      }
    };

    new Reporter(mockRunner, options);

    let curTestTitle = 'test title';
    const testInfo     = {
      fullTitle: ()=> {
        return curTestTitle;
      },
      duration:  10
    };

    eventCallbacks['pass'](testInfo);
    expect(statusSent.total).to.eql(10);
    expect(statusSent.passes).to.eql(1);
    expect(statusSent.fails).to.eql(0);
    expect(statusSent.incomplete).to.eql(9);
    expect(statusSent.duration).to.eql(0);
    expect(statusSent.start).to.be.defined;
    expect(statusSent.end).to.be.null;
    expect(statusSent.schedule).to.eql(options.reporterOptions.schedule);
    expect(statusSent.tests.length).to.eql(1);
    expect(statusSent.tests[0]).to.eql({
      name:     'test title',
      duration: 10
    });

    curTestTitle      = 'test title 2';
    testInfo.duration = 20;
    eventCallbacks['pass'](testInfo);
    expect(statusSent.total).to.eql(10);
    expect(statusSent.passes).to.eql(2);
    expect(statusSent.fails).to.eql(0);
    expect(statusSent.incomplete).to.eql(8);
    expect(statusSent.duration).to.eql(0);
    expect(statusSent.start).to.be.defined;
    expect(statusSent.end).to.be.null;
    expect(statusSent.schedule).to.eql(options.reporterOptions.schedule);
    expect(statusSent.tests.length).to.eql(2);
    expect(statusSent.tests[1]).to.eql({
      name:     'test title 2',
      duration: 20
    });

    curTestTitle      = 'test title 3';
    testInfo.duration = 15;
    eventCallbacks['pass'](testInfo);
    expect(statusSent.total).to.eql(10);
    expect(statusSent.passes).to.eql(3);
    expect(statusSent.fails).to.eql(0);
    expect(statusSent.incomplete).to.eql(7);
    expect(statusSent.duration).to.eql(0);
    expect(statusSent.start).to.be.defined;
    expect(statusSent.end).to.be.null;
    expect(statusSent.schedule).to.eql(options.reporterOptions.schedule);
    expect(statusSent.tests.length).to.eql(3);
    expect(statusSent.tests[2]).to.eql({
      name:     'test title 3',
      duration: 15
    });

    curTestTitle      = 'test title 4';
    testInfo.duration = 210;
    testInfo.message  = 'test error 1';
    testInfo.stack    = 'stack trace here';
    eventCallbacks['fail'](testInfo, {
      message: 'test error 1',
      stack:   'stack trace here'
    });
    expect(statusSent.total).to.eql(10);
    expect(statusSent.passes).to.eql(3);
    expect(statusSent.fails).to.eql(1);
    expect(statusSent.incomplete).to.eql(6);
    expect(statusSent.duration).to.eql(0);
    expect(statusSent.start).to.be.defined;
    expect(statusSent.end).to.be.null;
    expect(statusSent.schedule).to.eql(options.reporterOptions.schedule);
    expect(statusSent.tests.length).to.eql(4);
    expect(statusSent.tests[3]).to.eql({
      name:     'test title 4',
      duration: 210,
      error:    testInfo.message,
      stack:    testInfo.stack
    });

    setTimeout(()=> {
      eventCallbacks['end']();
      expect(statusSent.total).to.eql(10);
      expect(statusSent.passes).to.eql(3);
      expect(statusSent.fails).to.eql(1);
      expect(statusSent.incomplete).to.eql(6);
      expect(statusSent.duration).to.not.eql(0);
      expect(statusSent.start).to.be.defined;
      expect(statusSent.end).to.be.defined;
      expect(statusSent.schedule).to.eql(options.reporterOptions.schedule);
      expect(statusSent.tests.length).to.eql(4);
      done();
    }, 5);
  });
});