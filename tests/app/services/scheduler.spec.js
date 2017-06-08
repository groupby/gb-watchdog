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
const log    = config.log;

chai.use(chaiAsPromised);

describe('scheduler service', () => {
  config.setConfig({logLevel: 'debug'});
  // const log = config.log;

  let scheduler      = null;
  let testRunnerMock = null;

  beforeEach(() => {
    testRunnerMock = {
      run:   (arg) => {
      },
      abort: () => {
      }
    };
    scheduler      = new Scheduler(testRunnerMock);
  });

  afterEach(() => {
    try {
      scheduler.stop();
    } catch (ex) {
      log.error('probably bad');
      // Do nothing
    }
  });

  it('should add schedule to all schedules', () => {
    let schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', schedule);

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);
    expect(schedules['default'].schedules).to.eql(schedule.schedules);

    const status = scheduler.status();
    expect(status.schedules.default.prevRun).to.eql('never');
    expect(status.schedules.default.nextRun).to.eql('stopped');
  });

  it('should NOT add schedule that already exists', () => {
    const schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', schedule);

    const throws = () => {
      scheduler.add('default', schedule);
    };

    expect(throws).to.throw(/schedule 'default' already exists/);
  });

  it('should add schedule and start it if scheduler is running', () => {
    let schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    scheduler.start();
    scheduler.update();

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', schedule);

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);
    expect(schedules['default'].schedules).to.eql(schedule.schedules);

    const status = scheduler.status();
    expect(status.schedules.default.prevRun).to.eql('never');
    expect(moment(status.schedules.default.nextRun).valueOf()).to.be.above((new Date()).valueOf());
  });

  it('should NOT add schedule without name', () => {
    const schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    let throws     = () => {
      scheduler.add(null, schedule);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.add('', schedule);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.add(1, schedule);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.add(['name'], schedule);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);
  });

  it('should parse and add schedule to all schedules', () => {
    let schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);
    expect(schedules['default'].schedules).to.eql(schedule.schedules);
  });

  it('should update an existing schedule', () => {
    let schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    scheduler.start();

    let schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours');
    scheduler.add('default', schedule);

    let status = scheduler.status();
    expect(status.schedules.default.prevRun).to.eql('never');
    expect(moment(status.schedules.default.nextRun).valueOf()).to.be.above(moment().valueOf());
    const twoMinuteNextRun = moment(status.schedules.default.nextRun);

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);
    expect(schedules['default'].exceptions).to.eql(schedule.exceptions);

    schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 days');
    scheduler.update('default', schedule);

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);
    expect(schedules['default'].exceptions).to.be.empty;

    status = scheduler.status();
    expect(status.schedules.default.prevRun).to.eql('never');
    expect(moment(status.schedules.default.nextRun).valueOf()).to.be.above(twoMinuteNextRun.valueOf());
  });

  it('should NOT update schedule that doesnt exist', () => {
    const schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    const throws   = () => {
      scheduler.update('default', schedule);
    };

    expect(throws).to.throw(/schedule 'default' does not exist/);
  });

  it('should NOT update a schedule without name', () => {
    let schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    let schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', schedule);

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);
    expect(schedules['default'].exceptions).to.eql(schedule.exceptions);

    schedule   = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours');
    let throws = () => {
      scheduler.update(null, schedule);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.update('', schedule);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.update(1, schedule);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.update(['name'], schedule);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);
  });

  it('should parse and update an existing schedule', () => {
    let schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', schedule);

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);
    expect(schedules['default'].exceptions).to.eql(schedule.exceptions);

    new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours');
    scheduler.update('default', 'run tests/fakeE2ETests/fakeTest.js every 2 hours');

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);
    expect(schedules['default'].exceptions).to.be.empty;
  });

  it('should stop and delete a running schedule by name', () => {
    let schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    scheduler.start();

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', schedule);

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);

    scheduler.delete('default');
    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    expect(scheduler.status().schedules).to.eql({});
  });

  it('should NOT delete a schedule that doesnt exist', () => {
    let schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', schedule);

    schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(1);

    let throws = () => {
      scheduler.delete('notDefault');
    };
    expect(throws).to.throw(/schedule 'notDefault' does not exist/);

    throws = () => {
      scheduler.delete('');
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.delete(1);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.delete(null);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);
  });

  it('should get a specific schedule', () => {
    const schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');
    scheduler.add('default', 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');

    const gotSchedule = scheduler.get('default');
    expect(gotSchedule.schedules).to.eql(schedule.schedules);
  });

  it('should NOT get a specific schedule if it doesnt exist', () => {
    const schedules = scheduler.getAll();
    expect(_.size(schedules)).to.eql(0);

    scheduler.add('default', 'run tests/fakeE2ETests/fakeTest.js every 2 hours except on saturday, sunday');

    let throws = () => {
      scheduler.get('notHere');
    };
    expect(throws).to.throw(/schedule 'notHere' does not exist/);

    throws = () => {
      scheduler.get(1);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.get();
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.get('');
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.get(null);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);

    throws = () => {
      scheduler.get([]);
    };
    expect(throws).to.throw(/name must be string of 1-40 alphanumeric characters/);
  });

  it('should start the scheduler', (done) => {
    testRunnerMock.run = (name, files) => {
      expect(scheduler.status().state).to.eql('running');
      expect(scheduler.status().schedules.default.prevRun).to.not.eql('none');
      expect(name).to.eql('default');
      expect(files).to.eql(schedule.files);
      scheduler.stop();
      done();
    };

    const schedule = {
      schedules: [
        {
          s: Array.from(Array(60).keys()) // Fill array with all values from 0-60
        }
      ],
      files:     ['tests/fakeE2ETests/fakeTest.js']
    };
    scheduler.add('default', schedule);

    expect(scheduler.status().state).to.eql('stopped');
    expect(scheduler.status().schedules.default.prevRun).to.eql('never');
    scheduler.start();
  });

  it('should stop the scheduler', () => {
    const schedule = {
      schedules: [
        {
          h: [1]
        }
      ],
      files:     ['tests/fakeE2ETests/fakeTest.js']
    };
    scheduler.add('default', schedule);
    expect(scheduler.status().state).to.eql('stopped');
    expect(scheduler.status().schedules.default.prevRun).to.eql('never');
    scheduler.start();

    const throws = () => {
      scheduler.start();
    };

    expect(throws).to.throw(/Scheduler is already running/);
    scheduler.stop();
  });

  it('should NOT be created with an invalid testRunner', () => {
    let throws = () => {
      scheduler = new Scheduler(() => {
      });
    };
    expect(throws).to.throws(/testRunner must have 'run' function/);

    throws = () => {
      scheduler = new Scheduler(null);
    };
    expect(throws).to.throws(/testRunner must have 'run' function/);

    throws = () => {
      scheduler = new Scheduler('');
    };
    expect(throws).to.throws(/testRunner must have 'run' function/);
  });
});