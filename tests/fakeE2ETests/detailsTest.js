const chai           = require('chai');
const expect         = chai.expect;

describe('details service', ()=> {
  it('details test 1', ()=> {
    expect(true).to.eql(true);
  });
  it('details test 2', ()=> {
    return Promise.reject(new Error('Test failed due to: being a bad test'));
  });
  it('details test 3', ()=> {
    expect(true).to.eql(false);
  });
  it('details test 4', ()=> {
    return Promise.reject(new Error('This test is a bad test'));
  });
});