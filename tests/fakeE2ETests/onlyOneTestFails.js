const expect = require('chai').expect;
const _      = require('lodash');

const keyObject = {
  anthropologie: {},
  systemax:      {},
  novica:        {},
  austinkayak:   {},
};

_.forEach(keyObject, (value, customerId) => {
  describe(`${customerId}`, () => {
    it('assert test', () => {
      if (customerId === "novica") {
        expect(true).to.eql(false);
      }
    }).timeout(20000);
  });
});