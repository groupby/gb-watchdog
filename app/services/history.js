const _             = require('lodash');
const Promise       = require('bluebird');
const Result        = require('../models/result');
const elasticsearch = require('../../config/elasticsearch');
const config        = require('../../config');

const MAX_LOCAL_HISTORY = 10000;

const History = function (host) {
  const self = this;
  const log  = config.log;
  let client = null;

  let INDEX_NAME = null;

  if (_.isString(host) && host.length > 0) {
    if (!config.elasticsearch.indexSuffix) {
      throw new Error('config.elasticsearch.indexSuffix must be defined');
    }

    INDEX_NAME =`${config.FRAMEWORK_NAME}_${config.elasticsearch.indexSuffix}`;
    client = elasticsearch.createClient(host);
  } else {
    client = null;
  }

  let localHistory = [];

  self.getResults = (query) => {
    log.debug('Getting results with query: ', JSON.stringify(query));
    if (client !== null) {
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

    if (client !== null) {
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

    if (client !== null) {
      return clearEsResults();
    } else {
      localHistory = [];
      return Promise.resolve();
    }
  };

  const clearEsResults = () => {
    return client.indices.delete({
      index:  INDEX_NAME,
      ignore: 404
    });
  };

  const addEsResult = (result) => {
    return ensureTemplate().then(()=> {
      return client.create({
        index: INDEX_NAME,
        type:  'history',
        body:  result
      })
    });
  };

  const getEsResults = (query) => {
    return ensureTemplate().then(()=> {
      return client.search({
        index:  INDEX_NAME,
        body:   query,
        ignore: 404
      });
    }).then(response => {
      if (response.status === 404) {
        return [];
      } else {
        return _.map(response.hits.hits, hit => new Result(hit._source));
      }
    });
  };

  const ensureTemplate = () => {
    return elasticsearch.ensureTemplateExists(client);
  };
};

module.exports = History;