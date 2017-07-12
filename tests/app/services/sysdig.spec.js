/*eslint no-magic-numbers: "off" */
// const chai           = require('chai');
const nock       = require('nock');
const httpStatus = require('http-status');
const Sysdig     = require('../../../app/services/sysdig');

describe('sysdig service', () => {

  it('should post body to sysdig', () => {
    const sysdig      = new Sysdig('token');
    const name        = 'monitoringService';
    const description = 'fireSize';
    const severity    = 'REALbad';
    const namespace   = 'spaceName';
    const tags        = {
      tag1: 'yo'
    };
    const body        = {
      'event': {
        'name':        name,
        'description': description,
        'severity':    severity,
        'filter':      namespace ? `kubernetes.namespace.name=${namespace}` : '',
        'tags':        tags
      }
    };

    nock(Sysdig.HOST, {
      reqheaders: {
        'Content-Type':  'application/json; charset=UTF-8',
        'Accept':        'application/json',
        'Authorization': `Bearer token`
      }
    })
    .post(Sysdig.PATH, JSON.stringify(body))
    .reply(httpStatus.OK);

    return sysdig.sendEvent(name, description, severity, namespace, tags);
  });

  it('should reject a post body to sysdig when request fails', (done) => {
    const sysdig      = new Sysdig('token');
    const name        = 'monitoringService';
    const description = 'fireSize';
    const severity    = 'REALbad';
    const namespace   = 'spaceName';
    const tags        = {
      tag1: 'yo'
    };
    const body        = {
      'event': {
        'name':        name,
        'description': description,
        'severity':    severity,
        'filter':      namespace ? `kubernetes.namespace.name=${namespace}` : '',
        'tags':        tags
      }
    };

    nock(Sysdig.HOST, {
      reqheaders: {
        'Content-Type':  'application/json; charset=UTF-8',
        'Accept':        'application/json',
        'Authorization': `Bearer token`
      }
    })
    .post(Sysdig.PATH, JSON.stringify(body))
    .reply(httpStatus.BAD_GATEWAY);

    sysdig.sendEvent(name, description, severity, namespace, tags)
    .catch(() => done());
  });
});
