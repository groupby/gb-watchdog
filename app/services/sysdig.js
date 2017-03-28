const rp     = require('request-promise');
const config = require('../../config');
const log    = config.log;

const HOST = 'https://app.sysdigcloud.com';
const PATH = '/api/events';
const URL  = HOST + PATH;

const Sysdig = function (sysdigApiToken) {
  const self = this;

  self.sendEvent = (name, description, severity, namespace, tags = {}) => {
    const options = {
      method:  'POST',
      uri:     URL,
      headers: {
        'Content-Type':  'application/json; charset=UTF-8',
        'Accept':        'application/json',
        'Authorization': `Bearer ${sysdigApiToken}`
      },
      body:    {
        'event': {
          'name':        name,
          'description': description,
          'severity':    severity,
          'filter':      namespace ? `kubernetes.namespace.name=${namespace}` : '',
          'tags':        tags
        }
      },
      json:    true // Automatically stringifies the body to JSON
    };

    return rp(options)
      .then(() => {
        log.debug(`200 received from sysdig`);
      })
      .catch((error) => {
        log.error(`error posting to sysdig: ${error}`);
        return Promise.reject(error);
      });

  };

  return self;
};

Sysdig.URL  = URL;
Sysdig.HOST = HOST;
Sysdig.PATH = PATH;

module.exports = Sysdig;