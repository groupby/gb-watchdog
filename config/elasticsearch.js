const _             = require('lodash');
const Promise       = require('bluebird');
const elasticsearch = require('elasticsearch');
const bunyan        = require('bunyan');
const hash          = require('object-hash');
const HTTPStatus    = require('http-status');
const PrettyStream  = require('bunyan-prettystream');
const prettyStdOut  = new PrettyStream({mode: 'dev'});
prettyStdOut.pipe(process.stdout);

const log = require('./index').log;

module.exports = function (logLevel) {
  const self = this;
  logLevel = logLevel || 'warn';

  let templatesFound = {};
  let aliasesFound   = {};
  let indicesFound   = {};

  const esLogger = bunyan.createLogger({
    name:   'es',
    type:   'raw',
    level:  logLevel,
    stream: prettyStdOut
  });

  self.esLogger = esLogger;

  const LogToBunyan = function () {
    this.error = esLogger.error.bind(esLogger);
    this.warning = esLogger.warn.bind(esLogger);
    this.info = esLogger.info.bind(esLogger);
    this.debug = esLogger.debug.bind(esLogger);
    this.trace = (method, requestUrl, body, responseBody, responseStatus) => {
      esLogger.trace({
        method:         method,
        requestUrl:     requestUrl,
        body:           body,
        responseBody:   responseBody,
        responseStatus: responseStatus
      });
    };
    this.close = () => {};
  };

  /**
   * Reset the templates, aliases, and indices found so far
   */
  self.clearFoundCache = () => {
    templatesFound = {};
    aliasesFound = {};
    indicesFound = {};
  };

  /**
   * Create new elasticsearch client
   * @param host
   * @param port
   * @param apiVersion
   * @returns {*}
   */
  self.createClient = (host, apiVersion) => {
    if (!_.isString(host)) {
      throw new Error('host must be a string');
    }

    if (!_.isString(apiVersion)) {
      throw new Error('apiVersion must be a string');
    }

    return new elasticsearch.Client({
      host:       host,
      apiVersion: apiVersion,
      log:        LogToBunyan,
      defer:      function () {
        let resolve = null;
        let reject  = null;

        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return {
          resolve: resolve,
          reject:  reject,
          promise: promise
        };
      }
    });
  };

  /**
   * Uses the client to check if the index exists, and creates it if it does not
   * @param client
   * @param index
   * @returns {*}
   */
  self.ensureIndexExists = (client, index) => {
    const toHash = {
      index: index
    };

    const aliasKey = hash(toHash);

    if (indicesFound[aliasKey]) {
      log.debug(`index '${index}' previously found`);
      return Promise.resolve('previously found');
    }

    return client.indices.exists({index: index}).then((response) => {
      if (!response) {
        log.info(`index '${index}' does not exist. creating ..`);

        return client.indices.create({index: index}).then(() => {
          log.info(`index '${index}' successfully created`);
          indicesFound[aliasKey] = true;
          return Promise.resolve('created');
        });
      }

      log.debug(`index '${index}' exists`);
      return Promise.resolve('exists');
    });
  };

  /**
   * Uses the client to check if the alias exists, and creates it if it does not
   * @param client
   * @param alias
   * @param index
   * @returns {*}
   */
  self.ensureAliasExists = (client, alias, index) => {
    const toHash = {
      alias: alias,
      index: index
    };

    const aliasKey = hash(toHash);

    if (aliasesFound[aliasKey]) {
      log.debug(`alias '${alias}' previously found`);
      return Promise.resolve('previously found');
    }

    return client.indices.existsAlias({
      name:  alias,
      index: index
    }).then((response) => {
      if (!response) {
        log.info(`alias '${alias}' does not exist. creating ..`);

        return client.indices.putAlias({
          name:  alias,
          index: index
        }).then(() => {
          log.info(`alias '${alias}' successfully created`);
          aliasesFound[aliasKey] = true;
          return Promise.resolve('created');
        });
      }

      log.debug(`alias '${alias}' exists`);
      return Promise.resolve('exists');
    });
  };

  /**
   * Uses the client to check if the template exists, and creates it if it does not
   * @param client
   * @param name
   * @param template
   * @returns {*}
   */
  self.ensureTemplateExists = (client, name, template) => {
    const toHash = {
      name:     name,
      template: template
    };

    const templateKey = hash(toHash);

    if (templatesFound[templateKey]) {
      log.debug(`template '${name}' previously found`);
      return Promise.resolve('previously found');
    }

    return client.indices.existsTemplate({name: name}).then((response) => {
      if (!response) {
        log.info(`template '${name}' does not exist. creating ..`);

        return client.indices.putTemplate({
          name: name,
          body: template
        }).then(() => {
          log.info(`template '${name}' successfully created`);
          templatesFound[templateKey] = true;
          return Promise.resolve('created');
        });
      }

      log.debug(`template '${name}' exists`);
      return Promise.resolve('exists');
    });
  };

  /**
   * Generic elasticsearch error wrapper
   * @param error
   * @returns {Promise}
   */
  self.handleError = (error) => {
    esLogger.error(`Error during es query: ${error}`);

    return Promise.reject({
      code:    HTTPStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error occurred',
      error:   error
    });
  };

  return self;
};

