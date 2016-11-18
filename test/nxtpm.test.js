const { assert, expect } = require('chai');
const nxtpm = require('../index.js');
const config = require('../lib/config.js');
const Nxt = require('../lib/nxt.js');
const nxt = new Nxt();
let cli;


describe('Validation', () => {

  it('Accepts valid manifests', done => {
    const data = require('./data/manifests_valid.js');
    for (manifest of data) {
      assert.ok(nxtpm.PackageBuilder.validate(manifest));
    }
    done();
  });

  it('Rejects invalid manifests', done => {
    const data = require('./data/manifests_invalid.js');
    for (manifest of data) {
      expect(() => nxtpm.PackageBuilder.validate(manifest)).to.throw(Error);
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
      console.log(err.stack);
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
