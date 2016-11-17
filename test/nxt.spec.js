const assert = require('assert');
const Nxt = require('../lib/nxt.js');
const nxt = new Nxt();
const nxtpm = require('../index.js');
const config = require('../lib/config.js');

describe('Nxt', () => {
  it('does an API request', done => {
    nxt.request({ requestType: 'getAlias', aliasName: 'test5' })
    .then(data => {
      assert(true);
      done();
    }, err => {
      assert(false)
      done();
    });
  });
});

describe('Config', () => {
  it('Can set custom config', done => {
    nxtpm.setConfig('nxt:numSources', 123);
    const numSources = config.get('nxt:numSources');
    assert.equal(numSources, 123);
    done();
  });
});
