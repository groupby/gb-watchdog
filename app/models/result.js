const _         = require('lodash');
const inspector = require('schema-inspector');

const ISO_86001_REGEX = /(\d{4})-(0[1-9]|1[0-2]|[1-9])-(\3([12]\d|0[1-9]|3[01])|[1-9])[tT\s]([01]\d|2[0-3])\:(([0-5]\d)|\d)\:(([0-5]\d)|\d)([\.,]\d+)?([zZ]|([\+-])([01]\d|2[0-3]|\d):(([0-5]\d)|\d))$/;

const SCHEMA = {
  type:       'object',
  strict: true,
  properties: {
    start:    {
      type:    'string',
      pattern: ISO_86001_REGEX,
      error:   'must be an ISO 86001 date'
    },
    end:      {
      type:    'string',
      pattern: ISO_86001_REGEX,
      error:   'must be an ISO 86001 date'
    },
    duration: {
      type: 'integer',
      gte:  0
    },
    passes:   {
      type: 'integer',
      gte:  0
    },
    fails:    {
      type: 'integer',
      gte:  0
    },
    incomplete:    {
      type: 'integer',
      gte:  0
    },
    total:    {
      type: 'integer',
      gte:  0
    },
    schedule: {
      type: 'object',
      properties: {
        name: {
          type: 'string'
        },
        files: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      }
    },
    tests:    {
      type:  'array',
      items: {
        type:       'object',
        properties: {
          name:     {
            type:      'string',
            minLength: 1
          },
          duration: {
            type: 'integer',
            gte:  0
          },
          error:    {
            type:     'string',
            optional: true
          },
          stack:    {
            type:     'string',
            optional: true
          }
        }
      }
    }
  }
};

const Result = function (params) {
  const self = this;

  inspector.sanitize(SCHEMA, params);
  const result = inspector.validate(SCHEMA, params);

  if (!result.valid) {
    throw new Error(result.format());
  }

  _.merge(self, params);

  return self;
};

module.exports = Result;