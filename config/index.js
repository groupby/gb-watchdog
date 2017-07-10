const _            = require('lodash');
const inspector    = require('schema-inspector');
const bunyan       = require('bunyan');
const PrettyStream = require('bunyan-prettystream');
const prettyStdOut = new PrettyStream({mode: 'dev', useColor: false});
prettyStdOut.pipe(process.stdout);

const SCHEMA = {
  type:       'object',
  properties: {
    sysdig:        {
      optional:   true,
      properties: {
        apiKey: {
          type:      'string',
          minLength: 1
        },
        alert:  {
          properties: {
            namespace: {
              type:      'string',
              minLength: 1
            },
            severity:  {
              type:      'string',
              minLength: 1
            },
            tags:      {
              optional:   true,
              properties: {
                '*': {
                  type:      'string',
                  minLength: 1
                }
              }
            }
          }
        }
      }
    },
    elasticsearch: {
      optional:   true,
      type:       'object',
      properties: {
        host:        {
          type:      'string',
          minLength: 1
        },
        apiVersion:  {
          type:   'string',
          length: 3
        },
        logLevel:    {
          optional:  true,
          type:      'string',
          minLength: 1
        },
        indexSuffix: {
          type:      'string',
          pattern:   /^[a-z0-9_]{1,20}$/,
          minLength: 3
        }
      }
    },
    blipServer:    {
      optional:   true,
      type:       'object',
      properties: {
        host: {
          type:      'string',
          minLength: 1
        },
        port: {
          type: 'integer',
          gt:   0,
          lte:  65535
        },
      }
    },
    slack:         {
      optional:   true,
      type:       'object',
      properties: {
        url:      {
          type:    'string',
          pattern: 'url'
        },
        channel:  {
          type:    'string',
          pattern: /^#.+/
        },
        detailsChannel:  {
          type:    'string',
          pattern: /^#.+/,
          optional: true
        },
        username: {
          type:      'string',
          minLength: 1
        },
        verbose:  {
          type: 'boolean',
          def:  true
        }
      }
    },
    apiKey:        {
      optional:  true,
      type:      'string',
      minLength: 10
    },
    logLevel:      {
      optional:  true,
      type:      'string',
      minLength: 1
    },
    port:          {
      optional: true,
      type:     'integer',
      gt:       0,
      lte:      65535
    }
  }
};

const setConfig = (config) => {
  inspector.sanitize(SCHEMA, config);
  const result = inspector.validate(SCHEMA, config);

  if (!result.valid) {
    throw new Error(result.format());
  }

  // This just resets the initial config back to default without overwriting the root reference
  _.forEach(currentConfig, (value, key) => {
    delete currentConfig[key];

    if (DEFAULT_CONFIG[key]) {
      currentConfig[key] = _.cloneDeep(DEFAULT_CONFIG[key]);
    }
  });

  _.merge(currentConfig, config);

  currentConfig.setConfig = setConfig;
  currentConfig.log       = bunyan.createLogger({
    name:    currentConfig.FRAMEWORK_NAME,
    streams: [
      {
        type:   'raw',
        level:  currentConfig.logLevel,
        stream: prettyStdOut
      }
    ]
  });

  const printableConfig = _.clone(currentConfig);
  delete printableConfig.log;

  currentConfig.log.info('default', JSON.stringify(DEFAULT_CONFIG, null, 2));
  currentConfig.log.info('Config set to: ', JSON.stringify(printableConfig, null, 2));
};

const DEFAULT_CONFIG = {
  setConfig:      setConfig,
  FRAMEWORK_NAME: 'watchdog',
  logLevel:       'info',
  port:           7000
};

const currentConfig = {};
_.defaultsDeep(currentConfig, DEFAULT_CONFIG);

currentConfig.log = bunyan.createLogger({
  name:    currentConfig.FRAMEWORK_NAME,
  streams: [
    {
      type:   'raw',
      level:  currentConfig.logLevel,
      stream: prettyStdOut
    }
  ]
});

module.exports = currentConfig;