const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;

chai.use(chaiAsPromised);

describe('wisdom API', () => {
  it('should do a thing', () => {
    expect(true).to.eql(true);
  });

  it('should fail a thing', () => {
    expect(true).to.eql(false);
  });
});