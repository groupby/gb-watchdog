/*eslint no-magic-numbers: "off" */
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;
const request        = require('supertest-as-promised');
const Watchdog       = require('../../../index');

chai.use(chaiAsPromised);

describe('schedules api', ()=> {
  let watchdog = null;

  beforeEach(()=> {
    watchdog = new Watchdog({logLevel: 'debug'});
  });

  afterEach(() => {
    watchdog.services.scheduler.deleteAll();

    try {
      watchdog.services.scheduler.stop();
    } catch (ex) {
      // Do nothing
    }
  });

  it('should add schedules and return existing schedules', done => {
    request(watchdog).get('/schedules')
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((res)=> {
        expect(res.body).to.eql({});
      })
      .then(()=> {
        return request(watchdog).post('/schedules')
          .set('Content-Type', 'application/json')
          .send({
            name:     'runthistest',
            schedule: 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday'
          })
          .expect(201).catch(done);
      })
      .then(()=> {
        return request(watchdog).get('/schedules')
          .set('Content-Type', 'application/json')
          .expect(200)
          .then((res)=> {
            expect(res.body.runthistest).to.be.defined;
            expect(res.body.runthistest.files).to.eql(['tests/fakeE2ETests/fakeTest.js']);
            done();
          }).catch(done);
      });
  });

  it('should return specific schedules', done => {
    request(watchdog).get('/schedules')
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((res)=> {
        expect(res.body).to.eql({});
      })
      .then(()=> {
        return request(watchdog).post('/schedules')
          .set('Content-Type', 'application/json')
          .send({
            name:     'runthistest',
            schedule: 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday'
          })
          .expect(201).catch(done);
      })
      .then(()=> {
        return request(watchdog).get('/schedules/runthistest')
          .set('Content-Type', 'application/json')
          .expect(200)
          .then((res)=> {
            expect(res.body.files).to.eql(['tests/fakeE2ETests/fakeTest.js']);
            done();
          }).catch(done);
      });
  });

  it('should update specific schedules', done => {
    request(watchdog).get('/schedules')
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((res)=> {
        expect(res.body).to.eql({});
      })
      .then(()=> {
        return request(watchdog).post('/schedules')
          .set('Content-Type', 'application/json')
          .send({
            name:     'runthistest',
            schedule: 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday'
          })
          .expect(201).catch(done);
      })
      .then(()=> {
        return request(watchdog).get('/schedules/runthistest')
          .set('Content-Type', 'application/json')
          .expect(200)
          .then((res)=> {
            expect(res.body.files).to.eql(['tests/fakeE2ETests/fakeTest.js']);
          }).catch(done);
      })
      .then(()=> {
        return request(watchdog).put('/schedules/runthistest')
          .set('Content-Type', 'application/json')
          .send({schedule: 'run tests/fakeE2ETests/noopTest.js every 2 days'})
          .expect(201).catch(done);
      })
      .then(()=> {
        return request(watchdog).get('/schedules/runthistest')
          .set('Content-Type', 'application/json')
          .expect(200)
          .then((res)=> {
            expect(res.body.files).to.eql(['tests/fakeE2ETests/noopTest.js']);
            done();
          }).catch(done);
      });
  });

  it('should delete specific schedules', done => {
    request(watchdog).get('/schedules')
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((res)=> {
        expect(res.body).to.eql({});
      })
      .then(()=> {
        return request(watchdog).post('/schedules')
          .set('Content-Type', 'application/json')
          .send({
            name:     'runthistest',
            schedule: 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday'
          })
          .expect(201).catch(done);
      })
      .then(()=> {
        return request(watchdog).delete('/schedules/runthistest')
          .set('Content-Type', 'application/json')
          .expect(204).catch(done);
      })
      .then(()=> {
        return request(watchdog).get('/schedules/runthistest')
          .set('Content-Type', 'application/json')
          .expect(404)
          .then(()=> {
            done();
          }).catch(done);
      });
  });

  it('should return specific schedules', done => {
    request(watchdog).get('/schedules')
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((res)=> {
        expect(res.body).to.eql({});
      })
      .then(()=> {
        return request(watchdog).post('/schedules')
          .set('Content-Type', 'application/json')
          .send({
            name:     'runthistest',
            schedule: 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday'
          })
          .expect(201);
      })
      .then(()=> {
        return request(watchdog).get('/schedules/runthistest')
          .set('Content-Type', 'application/json')
          .expect(200)
          .then((res)=> {
            expect(res.body.files).to.eql(['tests/fakeE2ETests/fakeTest.js']);
            done();
          })
      });
  });

  it('should start scheduler', done => {
    request(watchdog).post('/schedules')
      .set('Content-Type', 'application/json')
      .send({
        name:     'runthistest',
        schedule: 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday'
      })
      .expect(201)
      .then(()=> {
        return request(watchdog).post('/schedules/_start')
          .set('Content-Type', 'application/json')
          .expect(200)
          .then((res)=> {
            expect(res.body).to.eql({message: 'started'});
          });
      })
      .then(()=> {
        expect(watchdog.services.scheduler.status().state).to.eql('running');
        return request(watchdog).post('/schedules/_start')
          .set('Content-Type', 'application/json')
          .expect(400)
          .then((res)=> {
            expect(res.body.error).to.eql('Scheduler is already running');
            done();
          });
      });
  });

  it('should stop scheduler', done => {
    request(watchdog).post('/schedules')
      .set('Content-Type', 'application/json')
      .send({
        name:     'runthistest',
        schedule: 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday'
      })
      .expect(201)
      .then(()=> {
        return request(watchdog).post('/schedules/_start')
          .set('Content-Type', 'application/json')
          .expect(200)
          .then((res)=> {
            expect(res.body).to.eql({message: 'started'});
          });
      })
      .then(()=> {
        expect(watchdog.services.scheduler.status().state).to.eql('running');
        return request(watchdog).post('/schedules/_stop')
          .set('Content-Type', 'application/json')
          .expect(200)
          .then((res)=> {
            expect(res.body).to.eql({message: 'stopped'});
          });
      })
      .then(()=> {
        expect(watchdog.services.scheduler.status().state).to.eql('stopped');
        return request(watchdog).post('/schedules/_stop')
          .set('Content-Type', 'application/json')
          .expect(400)
          .then((res)=> {
            expect(res.body).to.eql({error: 'Scheduler is already stopped'});
            done();
          });
      });
  });

});