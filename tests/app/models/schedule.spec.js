/*eslint no-magic-numbers: "off" */
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;

const Schedule = require('../../../app/models/schedule');

chai.use(chaiAsPromised);

describe('schedule model', ()=> {
  it('should accept valid string input', ()=> {
    const schedule = new Schedule('run tests/fakeE2ETests/fakeTest.js,tests/fakeE2ETests/fakeTest2.js every 12 hours');
    expect(schedule.files).to.include('tests/fakeE2ETests/fakeTest.js');
    expect(schedule.files).to.include('tests/fakeE2ETests/fakeTest2.js');
    expect(schedule.schedules.length).to.eql(1);
    expect(schedule.schedules[0].h).to.eql([
      0,
      12
    ]);
  });

  it('should not accept invalid string input', ()=> {
    let scheduleString = 'run missingFile.js every 12 hours';
    const throws       = ()=> {
      new Schedule(scheduleString);
    };
    expect(throws).to.throw(/file: missingFile\.js not found/);

    scheduleString = 'run tests/fakeE2ETests/nonJsFile.txt every 12 hours';
    expect(throws).to.throw(/must provide at least one \.js test file to run/);

    scheduleString = 'run tests/fakeE2ETests/fakeTest.js,tests/fakeE2ETests/nonJsFile.txt every 12 hours';
    expect(throws).to.throw(/second word of schedule string must be comma-delimited list of \.js files, no spaces/);

    scheduleString = 'explode tests/fakeE2ETests/fakeTest.js every 12 hours';
    expect(throws).to.throw(/first word of schedule string must be "run"/);

    scheduleString = 'tests/fakeE2ETests/fakeTest.js every 12 hours';
    expect(throws).to.throw(/first word of schedule string must be "run"/);

    scheduleString = 'run every 12 hours';
    expect(throws).to.throw(/must provide at least one \.js test file to run/);

    scheduleString = 'run tests/fakeE2ETests/fakeTest.js,tests/fakeE2ETests/fakeTest2.js every 12 star wars movies';
    expect(throws).to.throw(/error while parsing/);
  });

  it('should accept valid object input', ()=> {
    const params = {
      schedules:  [
        {
          h: [
            0,
            12
          ]
        }
      ],
      exceptions: [
        {
          m: [
            0,
            5
          ]
        }
      ],
      files:      ['tests/fakeE2ETests/fakeTest.js'],
      ignored:    'something'
    };

    const schedule = new Schedule(params);
    expect(schedule.schedules.length).to.eql(1);
    expect(schedule.schedules[0]).to.eql(params.schedules[0]);
    expect(schedule.exceptions.length).to.eql(1);
    expect(schedule.exceptions[0]).to.eql(params.exceptions[0]);
    expect(schedule.files.length).to.eql(1);
    expect(schedule.files[0]).to.eql(params.files[0]);
    expect(schedule.ignored).to.be.undefined;
  });

  it('should reject invalid object input', ()=> {
    let params = {
      schedules:  'doesnt accept strings',
      exceptions: [
        {
          m: [
            0,
            5
          ]
        }
      ],
      files:      ['tests/fakeE2ETests/fakeTest.js'],
      ignored:    'something'
    };

    const throws = () => {
      new Schedule(params);
    };

    expect(throws).to.throw(/must be object/);

    params = {
      schedules:  [
        'doesnt accept strings'
      ],
      exceptions: [
        {
          m: [
            0,
            5
          ]
        }
      ],
      files:      ['tests/fakeE2ETests/fakeTest.js'],
      ignored:    'something'
    };
    expect(throws).to.throw(/must be object/);

    params = {
      schedules:  [
        {
          m: [
            0,
            5
          ]
        }
      ],
      exceptions: [
        {
          m: [
            0,
            5
          ]
        }
      ],
      ignored:    'something'
    };
    expect(throws).to.throw(/files: is missing and not optional/);
  });
});