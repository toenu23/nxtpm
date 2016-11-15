const assert = require('assert');
const Nxt = require('../lib/nxt.js');
const nxt = new Nxt();
const nxtpm = require('../index.js');
const config = require('../lib/config.js');

describe('Nxt', function() {
  it('does an API request', function(done) {
    nxt.request({ requestType: 'getAlias', aliasName: 'test5' })
    .then(function(data) {
      assert(true);
      done();
    }, function(err) {
      assert(false)
      done();
    });
  });
});

describe('Config', function() {
  it('Can set custom config', function(done) {
    nxtpm.setConfig('nxt:numSources', 123);
    const numSources = config.get('nxt:numSources');
    assert.equal(numSources, 123);
    done();
  });
});
