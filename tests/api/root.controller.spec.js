/*eslint no-magic-numbers: "off" */
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;
const moment         = require('moment');
const request        = require('supertest-as-promised');
const Watchdog       = require('../../index');

chai.use(chaiAsPromised);

describe('root api', ()=> {
  let watchdog = null;

  beforeEach(done => {
    watchdog = new Watchdog({logLevel: 'debug'});
    watchdog.services.scheduler.deleteAll();
    watchdog.services.history.clearResults()
      .then(()=> {
        done();
      });
  });

  it('should return status of services', done => {
    request(watchdog).get('/status')
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((res)=> {
        expect(res.body.testRunner).to.eql({});
        expect(res.body.scheduler.state).to.eql('stopped');
        expect(res.body.scheduler.schedules).to.eql({});
      })
      .then(()=> {
        done();
      }).catch(done);
  });

  it('should return status of scheduled services', done => {
    watchdog.services.scheduler.start();

    const schedule = {
      schedules: [
        {
          s: Array.from(Array(60).keys()) // Fill array with all values from 0-60
        }
      ],
      files:     ['tests/fakeE2ETests/noopTest.js']
    };

    watchdog.services.scheduler.add('default', schedule);

    // Need a timeout to let the scheduler run once
    setTimeout(()=> {
      request(watchdog).get('/status')
        .set('Content-Type', 'application/json')
        .expect(200)
        .then((res)=> {
          expect(res.body.testRunner.default.total).to.eql(3);
          expect(res.body.scheduler.state).to.eql('running');
          expect(moment(res.body.scheduler.schedules.default.prevRun).valueOf()).to.be.below(moment().valueOf());
        })
        .then(()=> {
          done();
        }).catch(done);
    }, 1100);
  });
});

describe.skip('protected root api', ()=> {
  let watchdog = null;

  beforeEach((done) => {
    watchdog = new Watchdog({
      logLevel: 'debug',
      apiKey:   'somereallygoodapikey'
    });
    watchdog.services.scheduler.deleteAll();
    watchdog.services.history.clearResults()
      .then(()=> {
        done();
      });
  });

  it('should return status of services when providing api key', done => {
    request(watchdog).get('/status')
      .set('Content-Type', 'application/json')
      .set('api_key', 'somereallygoodapikey')
      .expect(200)
      .then(()=> {
        done();
      }).catch(done);
  });

  it('should NOT return status of services when NOT providing api key', done => {
    request(watchdog).get('/status')
      .set('Content-Type', 'application/json')
      .expect(400)
      .then(()=> {
        done();
      }).catch(done);
  });

  it('should NOT return status of services when providing incorrect api key', done => {
    request(watchdog).get('/status')
      .set('Content-Type', 'application/json')
      .set('api_key', 'incorrectkey')
      .expect(401)
      .then(()=> {
        done();
      }).catch(done);
  });
});