/*eslint no-invalid-this: "off"*/
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect         = chai.expect;
const moment         = require('moment');
const elasticsearch  = require('../../../config/elasticsearch')('info');
const _ = require('lodash');

const History = require('../../../app/services/history');

chai.use(chaiAsPromised);

describe('history service', ()=> {
  const INDEX  = 'watchdog_testing';

  const esConfig = {
    host:        'localhost:9200',
    apiVersion:  '2.2',
    logLevel:    'debug',
    indexSuffix: 'testing'
  };

  const client = elasticsearch.createClient(esConfig.host, esConfig.apiVersion);

  beforeEach((done)=> {
    client.indices.delete({
      index:  INDEX,
      ignore: 404
    }).then(() => {
      done();
    });
  });

  afterEach((done)=> {
    client.indices.delete({
      index:  INDEX,
      ignore: 404
    }).then(() => {
      done();
    });
  });

  it('should add results to local', (done) => {
    const history = new History();

    const result = {
      start:      moment().toISOString(),
      end:        moment().add(1, 'hour').toISOString(),
      duration:   10,
      passes:     1,
      fails:      2,
      incomplete: 0,
      total:      3,
      schedule:   {
        name:  'default',
        files: ['sometest.js']
      },
      tests:      [
        {
          name:     'first',
          duration: 10
        }
      ]
    };

    history.addResult(result).then(()=> {
      return client.indices.refresh();
    }).then(()=> {
      return history.getResults().then((results) => {
        expect(results.length).to.eql(1);
        expect(results[0]).to.eql(result);
      });
    }).then(()=> {
      return client.search({
        index:  INDEX,
        q:      '*',
        ignore: 404
      });
    }).then((response) => {
      expect(response.status).to.eql(404);
      done();
    }).catch(done);
  });

  it('should cap local history to last 10,000 events', function(done) {
    this.timeout(5000);

    const history = new History();

    const result = {
      start:      moment().toISOString(),
      end:        moment().add(1, 'hour').toISOString(),
      duration:   10,
      passes:     1,
      fails:      2,
      incomplete: 0,
      total:      3,
      schedule:   {
        name:  'default',
        files: ['sometest.js']
      },
      tests:      [
        {
          name:     'first',
          duration: 10
        }
      ]
    };

    _.times(15000, () => {
      history.addResult(result);
    });

    history.getResults().then((results) => {
      expect(results.length).to.eql(10000);
      done();
    });
  });

  it('should clear results from local', (done) => {
    const history = new History();

    const result = {
      start:      moment().toISOString(),
      end:        moment().add(1, 'hour').toISOString(),
      duration:   10,
      passes:     1,
      fails:      2,
      incomplete: 0,
      total:      3,
      schedule:   {
        name:  'default',
        files: ['sometest.js']
      },
      tests:      [
        {
          name:     'first',
          duration: 10
        }
      ]
    };

    history.addResult(result).then(()=> {
      return history.getResults().then((results) => {
        expect(results.length).to.eql(1);
        expect(results[0]).to.eql(result);
      });
    }).then(()=> {
      return history.clearResults();
    }).then(()=> {
      return history.getResults().then((results) => {
        expect(results.length).to.eql(0);
        done();
      });
    }).catch(done);
  });

  it('should add results to elasticsearch', (done) => {
    const history = new History(client, 'testing');

    const result = {
      start:      moment().toISOString(),
      end:        moment().add(1, 'hour').toISOString(),
      duration:   10,
      passes:     1,
      fails:      2,
      incomplete: 0,
      total:      3,
      schedule:   {
        name:  'default',
        files: ['sometest.js']
      },
      tests:      [
        {
          name:     'first',
          duration: 10
        }
      ]
    };

    history.addResult(result).then(()=> {
      return client.indices.refresh();
    }).then(()=> {
      return history.getResults().then((results) => {
        expect(results.length).to.eql(1);
        expect(results[0]).to.eql(result);
      })
    }).then(()=> {
      return client.search({
        index: INDEX,
        q:     '*'
      });
    }).then((response) => {
      expect(response.hits.hits.length).to.eql(1);
      expect(response.hits.hits[0]._source).to.eql(result);
      done();
    }).catch(done);
  });

  it('should clear results from elasticsearch', (done) => {
    const history = new History(client, 'testing');

    const result = {
      start:      moment().toISOString(),
      end:        moment().add(1, 'hour').toISOString(),
      duration:   10,
      passes:     1,
      fails:      2,
      incomplete: 0,
      total:      3,
      schedule:   {
        name:  'default',
        files: ['sometest.js']
      },
      tests:      [
        {
          name:     'first',
          duration: 10
        }
      ]
    };

    history.addResult(result).then(()=> {
      return client.indices.refresh();
    }).then(()=> {
      return history.getResults().then((results) => {
        expect(results.length).to.eql(1);
        expect(results[0]).to.eql(result);
      })
    }).then(()=> {
      return history.clearResults();
    }).then(()=> {
      return history.getResults().then((results) => {
        expect(results.length).to.eql(0);
        done();
      });
    }).catch(done);
  });
});