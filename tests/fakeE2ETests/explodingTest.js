const chai           = require('chai');
const expect         = chai.expect;

describe('noop service', ()=> {
  it('explode test 1', ()=> {
    console.log('running exploding test 1');
    expect(true).to.eql(true);
  });
  it('explode test 2', ()=> {
    console.log('running exploding test 2');
    throw new Error(`test explode`)
  });
  it('explode test 3', ()=> {
    console.log('running exploding test 3');
    expect(false).to.eql(false);
  });
});