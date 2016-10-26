/*eslint no-magic-numbers: "off" */
const utils    = require('../../../utils');

module.exports = function(services) {
  const self = this;

  self.getResults = (req, res)=> {
    services.history.getResults(req.body)
      .then((results) => {
        res.status(200).json(results);
      })
      .catch((error) => {
        utils.processError(error, res);
      });
  };

  return self;
};