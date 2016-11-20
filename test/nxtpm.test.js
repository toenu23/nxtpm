const { assert, expect } = require('chai');
const nxtpm = require('../index.js');
const config = require('../lib/util/config.js');
const nxt = require('../lib/util/nxt.js');
let cli;


describe('Validation', () => {

  it('Accepts valid manifests', done => {
    const data = require('./data/manifests_valid.js');
    for (manifest of data) {
      assert.ok(nxtpm.manifest.validate(manifest));
    }
    done();
  });

  it('Rejects invalid manifests', done => {
    const data = require('./data/manifests_invalid.js');
    for (manifest of data) {
      expect(() => nxtpm.manifest.validate(manifest)).to.throw(Error);
    }
    done();
  });

});


describe('Nxt', () => {
  it('does an API request', done => {
    nxt.request({ requestType: 'getAlias', aliasName: 'test' })
    .then(data => {
      assert.equal(data.data.aliasName, 'test');
      done();
    }, err => {
      console.log(err.stack || err);
    });
  });
});

describe('Config', () => {
  it('Can set custom config', done => {
    nxtpm.setConfig('nxt:numSources', 1);
    const numSources = config.get('nxt:numSources');
    assert.equal(numSources, 1);
    nxt.request({ requestType: 'getConstants' })
    .then(data => {
      assert.equal(data.frequency, 1);
      assert.equal(data.score, 1);
      done();
    }, err => {
      console.log(err.stack || err);
    });
  });
});
