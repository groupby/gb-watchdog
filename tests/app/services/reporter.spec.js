/*eslint no-magic-numbers: "off" */
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;

const Reporter = require('../../../app/services/reporter');

chai.use(chaiAsPromised);

describe('reporter service', ()=> {
  it('should report status at end via slack', ()=> {
    const eventCallbacks = {};
    const mockRunner     = {
      total: 10,
      on:    (event, callback) => {
        eventCallbacks[event] = callback;
      }
    };

    let slackSent   = null;
    const mockSlack = {
      send: (arg)=> {
        slackSent = arg;
      }
    };

    const options = {
      reporterOptions: {
        slack:    mockSlack,
        channel:  'test_channel',
        username: 'test_user',
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

    curTestTitle      = 'test title 2';
    testInfo.duration = 20;
    eventCallbacks['pass'](testInfo);

    curTestTitle      = 'test title 3';
    testInfo.duration = 15;
    eventCallbacks['pass'](testInfo);

    curTestTitle      = 'test title 4';
    testInfo.duration = 210;
    testInfo.message  = 'test error 1';
    testInfo.stack    = 'stack trace here';
    eventCallbacks['fail'](testInfo, {
      message: 'test error 1',
      stack:   'stack trace here'
    });

    eventCallbacks['end']();
    expect(slackSent.text).to.match(/Passes:\s+3/);
    expect(slackSent.text).to.match(/Failures:\s+1/);
    expect(slackSent.text).to.match(/Incomplete:\s+6/);
    expect(slackSent.text).to.match(/Test:\s+test title 4/);
    expect(slackSent.text).to.match(/Msg:\s+test error 1/);
    expect(slackSent.text).to.match(/Stack:\s+stack trace here/);
  });

  it('should update status via callback', done => {
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

  it('should update status via history', done => {
    const eventCallbacks = {};
    const mockRunner     = {
      total: 10,
      on:    (event, callback) => {
        eventCallbacks[event] = callback;
      }
    };

    let historySent   = null;
    const mockHistory = {
      addResult: (arg)=> {
        historySent = arg;
      }
    };

    const options = {
      reporterOptions: {
        history: mockHistory,
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

    curTestTitle      = 'test title 2';
    testInfo.duration = 20;
    eventCallbacks['pass'](testInfo);

    curTestTitle      = 'test title 3';
    testInfo.duration = 15;
    eventCallbacks['pass'](testInfo);

    curTestTitle      = 'test title 4';
    testInfo.duration = 210;
    testInfo.message  = 'test error 1';
    testInfo.stack    = 'stack trace here';
    eventCallbacks['fail'](testInfo, {
      message: 'test error 1',
      stack:   'stack trace here'
    });

    setTimeout(()=>{
      eventCallbacks['end']();
      expect(historySent.total).to.eql(10);
      expect(historySent.passes).to.eql(3);
      expect(historySent.fails).to.eql(1);
      expect(historySent.incomplete).to.eql(6);
      expect(historySent.duration).to.not.eql(0);
      expect(historySent.start).to.be.defined;
      expect(historySent.end).to.be.defined;
      expect(historySent.schedule).to.eql(options.reporterOptions.schedule);
      expect(historySent.tests.length).to.eql(4);
      done();
    }, 5);
  });
});