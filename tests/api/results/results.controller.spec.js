/*eslint no-magic-numbers: "off" */
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;
const moment         = require('moment');
const request        = require('supertest-as-promised');
const Watchdog       = require('../../../index');

chai.use(chaiAsPromised);

describe('results api', ()=> {
  it('should get no results for empty system', (done) => {
    const watchdog = new Watchdog({logLevel: 'debug'});

    request(watchdog).get('/results')
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((res)=> {
        expect(res.body).to.eql([]);
        done();
      }).catch(done);
  });

  it('should get results', (done) => {
    const watchdog = new Watchdog({logLevel: 'debug'});

    const params = {
      start:      moment().toISOString(),
      end:        moment().add(1, 'hour').toISOString(),
      duration:   10,
      passes:     1,
      fails:      2,
      incomplete: 0,
      total:      3,
      schedule:   {
        name:  'default',
        files: ['sometest.js']
      },
      tests:      [
        {
          name:     'first',
          duration: 10
        }
      ]
    };

    watchdog.services.history.addResult(params).then(()=> {
      request(watchdog).get('/results')
        .set('Content-Type', 'application/json')
        .expect(200)
        .then((res)=> {
          expect(res.body.length).to.eql(1);
          expect(res.body[0]).to.eql(params);
          done();
        }).catch(done);
    });
  });
});