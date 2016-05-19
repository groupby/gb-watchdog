const config        = require('../config');
const Promise       = require('bluebird');
const elasticsearch = require('elasticsearch');
const bunyan        = require('bunyan');
const PrettyStream  = require('bunyan-prettystream');
const prettyStdOut  = new PrettyStream({mode: 'dev'});
prettyStdOut.pipe(process.stdout);

let templateFound = false;

const LogToBunyan = function () {
  const self = this;
  const bun  = bunyan.createLogger({
    name:   `${config.FRAMEWORK_NAME}-es`,
    type:   'raw',
    level:  config.elasticsearch.logLevel,
    stream: prettyStdOut
  });

  self.error   = bun.error.bind(bun);
  self.warning = bun.warn.bind(bun);
  self.info    = bun.info.bind(bun);
  self.debug   = bun.debug.bind(bun);
  self.trace   = (method, requestUrl, body, responseBody, responseStatus) => {
    bun.trace({
      method:         method,
      requestUrl:     requestUrl,
      body:           body,
      responseBody:   responseBody,
      responseStatus: responseStatus
    });
  };
  self.close   = () => {};
};

const createClient = (host) => {
  return new elasticsearch.Client({
    host:       host,
    apiVersion: config.elasticsearch.apiVersion,
    log:        LogToBunyan,
    defer:      function () {
      let resolve = null;
      let reject  = null;

      const promise = new Promise((res, rej) => {
        resolve = res;
        reject  = rej;
      });
      return {
        resolve: resolve,
        reject:  reject,
        promise: promise
      };
    }
  });
};

const ensureTemplateExists = (client) => {
  if (templateFound) {
    return Promise.resolve();
  }

  return client.indices.existsTemplate({name: config.FRAMEWORK_NAME}).then(response => {
    if (!response) {
      return client.indices.putTemplate({
        name: config.FRAMEWORK_NAME,
        body: WATCHDOG_INDEX_TEMPLATE
      });
    }

    return Promise.resolve();
  }).then(()=> {
    templateFound = true;
    return Promise.resolve();
  });
};

const WATCHDOG_INDEX_TEMPLATE = {
  template: `${config.FRAMEWORK_NAME}*`,
  settings: {
    number_of_shards:   1,
    number_of_replicas: 1
  },
  mappings: {
    history: {
      properties: {
        start:      {
          type:   'date',
          format: 'date_time'
        },
        end:        {
          type:   'date',
          format: 'date_time'
        },
        duration:   {
          type: 'integer'
        },
        passes:     {
          type: 'integer'
        },
        fails:      {
          type: 'integer'
        },
        incomplete: {
          type: 'integer'
        },
        total:      {
          type: 'integer'
        },
        tests:      {
          properties: {
            name:     {
              type:  'string',
              index: 'not_analyzed'
            },
            duration: {
              type: 'integer'
            },
            error:    {
              type:  'string',
              index: 'analyzed'
            },
            stack:    {
              type:  'string',
              index: 'analyzed'
            }
          }
        }
      }
    }
  }
};

module.exports = {
  createClient:         createClient,
  ensureTemplateExists: ensureTemplateExists
};