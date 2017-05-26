const chai           = require('chai');
const expect         = chai.expect;

describe('noop service', ()=> {
  it('noop test 1', ()=> {
    expect(true).to.eql(true);
  });
  it('noop test 2', ()=> {
    // throw new Error(`test explode`)
    expect(false).to.eql(true);
  });
  it('noop test 3', ()=> {
    expect(false).to.eql(false);
  });
});