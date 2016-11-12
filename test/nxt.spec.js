const assert = require('assert');
const Nxt = require('../lib/nxt.js');
const nxt = new Nxt();

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
