/*eslint no-magic-numbers: "off" */
const services = require('../../services');
const utils    = require('../../../utils');

const getResults = (req, res)=> {
  services.history.getResults(req.body)
    .then(results => {
      res.status(200).json(results);
    })
    .catch(error => {
      utils.processError(error, res);
    });
};

module.exports = {
  getResults: getResults
};