/*eslint no-process-env: "off" */
module.exports = {
  elasticsearch: {
    host:       (process.env.ES_HOST || 'es-new') + ':' + parseInt(process.env.ES_PORT || 9200),
    apiVersion: '2.3',
    logLevel:    'debug',
    indexSuffix: 'testing'
  }
};