const _             = require('lodash');
const Promise       = require('bluebird');
const Result        = require('../models/result');
const config        = require('../../config');
const elasticsearch = require('../../config/elasticsearch')('warn');
const log           = config.log;

const MAX_LOCAL_HISTORY = 10000;

const History = function (esClient, esIndexSuffix) {
  const self = this;

  let INDEX_NAME = null;

  if (esClient && !_.isObject(esClient)) {
    throw new Error('esClient must be an object');
  }

  if (esClient && !esIndexSuffix) {
    throw new Error('esIndexSuffix must be defined');
  } else {
    INDEX_NAME = `watchdog_${esIndexSuffix}`;
  }

  let localHistory = [];

  self.getResults = (query) => {
    log.debug('Getting results with query: ', JSON.stringify(query));
    if (esClient) {
      return getEsResults(query);
    } else {
      if (query) {
        log.warn('query will be ignored with no elasticsearch connection');
      }

      return Promise.resolve(_.cloneDeep(localHistory));
    }
  };

  self.addResult = (result) => {
    if (!(result instanceof Result)) {
      result = new Result(result);
    }

    log.debug('Adding result: ', JSON.stringify(result));

    if (esClient) {
      return addEsResult(result);
    } else {
      localHistory.push(result);

      while (localHistory.length > MAX_LOCAL_HISTORY) {
        localHistory.shift();
      }

      return Promise.resolve();
    }
  };

  self.clearResults = () => {
    log.debug('Clearing results');

    if (esClient) {
      return clearEsResults();
    } else {
      localHistory = [];
      return Promise.resolve();
    }
  };

  const clearEsResults = () => {
    return esClient.indices.delete({
      index:  INDEX_NAME,
      ignore: 404
    });
  };

  const addEsResult = (result) => {
    return ensureTemplate()
    .then(() => ensureIndex())
    .then(() => {
      return esClient.create({
        index:   INDEX_NAME,
        type:    'history',
        refresh: true,
        body:    result
      })
    });
  };

  const getEsResults = (query) => {
    return ensureTemplate()
    .then(() => ensureIndex())
    .then(() => {
      return esClient.search({
        index:  INDEX_NAME,
        body:   query,
        ignore: 404
      });
    }).then((response) => {
      if (response.status === 404) {
        return [];
      } else {
        return _.map(response.hits.hits, (hit) => new Result(hit._source));
      }
    });
  };

  const ensureTemplate = () => {
    return elasticsearch.ensureTemplateExists(esClient, 'watchdog', WATCHDOG_INDEX_TEMPLATE);
  };

  const ensureIndex = () => {
    return elasticsearch.ensureIndexExists(esClient, INDEX_NAME);
  }
};

const WATCHDOG_INDEX_TEMPLATE = {
  template: `watchdog*`,
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
        schedule:   {
          properties: {
            name:  {
              type:  'string',
              index: 'not_analyzed'
            },
            files: {
              type:  'string',
              index: 'not_analyzed'
            }
          }
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

module.exports = History;