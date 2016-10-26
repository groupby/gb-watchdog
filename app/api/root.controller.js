/*eslint no-magic-numbers: "off" */

module.exports = function(services) {
  const self = this;

  self.getStatus = (req, res) => {
    const response = {
      scheduler:  services.scheduler.status(),
      testRunner: services.testRunner.status()
    };

    res.status(200).json(response);
  };

  self.getHealth = (req, res) => {
    res.status(200).send();
  };

  return self;
};