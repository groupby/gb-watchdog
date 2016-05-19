const _              = require('lodash');
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;
const moment         = require('moment');

const Result = require('../../../app/models/result');

chai.use(chaiAsPromised);

describe('result model', ()=> {
  it('should accept valid input', ()=> {
    const params = {
      start:        moment().toISOString(),
      end:          moment().add(1, 'hour').toISOString(),
      duration:     10,
      passes:       1,
      fails:        2,
      incomplete:   0,
      total:        3,
      tests:        [
        {
          name:     'first',
          duration: 10
        }
      ],
      ignoredParam: 'will be removed'
    };
    const result = new Result(params);

    expect(result.start).to.eql(params.start);
    expect(result.end).to.eql(params.end);
    expect(result.duration).to.eql(params.duration);
    expect(result.passes).to.eql(params.passes);
    expect(result.fails).to.eql(params.fails);
    expect(result.tests).to.eql(params.tests);
    expect(result.ignoredParam).to.not.be.defined;
  });

  it('should reject invalid input', ()=> {
    const params = {
      start:      moment().toISOString(),
      end:        moment().add(1, 'hour').toISOString(),
      duration:   10,
      passes:     1,
      fails:      2,
      incomplete: 0,
      total:      3,
      tests:      [
        {
          name:     'first',
          duration: 10
        }
      ]
    };

    let throws = ()=> {
      const badParams = _.cloneDeep(params);
      badParams.start = 'not an ISO string';
      new Result(badParams);
    };
    expect(throws).to.throw(/must be an ISO 86001 date/);

    throws = ()=> {
      const badParams = _.cloneDeep(params);
      badParams.end   = 'not an ISO string';
      new Result(badParams);
    };
    expect(throws).to.throw(/must be an ISO 86001 date/);

    throws = ()=> {
      const badParams    = _.cloneDeep(params);
      badParams.duration = 'not an int';
      new Result(badParams);
    };
    expect(throws).to.throw(/must be integer/);

    throws = ()=> {
      const badParams    = _.cloneDeep(params);
      badParams.duration = -1;
      new Result(badParams);
    };
    expect(throws).to.throw(/must be greater than or equal to 0/);

    throws = ()=> {
      const badParams  = _.cloneDeep(params);
      badParams.passes = 'not an int';
      new Result(badParams);
    };
    expect(throws).to.throw(/must be integer/);

    throws = ()=> {
      const badParams  = _.cloneDeep(params);
      badParams.passes = -1;
      new Result(badParams);
    };
    expect(throws).to.throw(/must be greater than or equal to 0/);
  });
});