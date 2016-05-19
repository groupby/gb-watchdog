/*eslint no-magic-numbers: "off" */
const services = require('../services');

const getStatus = (req, res) => {
  const response = {
    scheduler:  services.scheduler.status(),
    testRunner: services.testRunner.status()
  };

  res.status(200).json(response);
};

module.exports = {
  getStatus: getStatus
};