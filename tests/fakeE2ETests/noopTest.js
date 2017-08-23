const chai   = require('chai');
const expect = chai.expect;

describe('noop service', () => {
  it('noop test 1', () => {
    expect(true).to.eql(true);
  });
  it('noop test 2', () => {
    expect(true).to.eql(false);
  });
  it('noop test 3', () => {
    expect(true).to.eql(false);
  });
});
