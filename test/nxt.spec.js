const assert = require('assert');
const Nxt = require('../lib/nxt.js');
const nxt = new Nxt();

describe('Nxt', function() {
  it('does an API request', function(done) {
    nxt.request({ requestType: 'getConstants' })
    .then(function(data) {
      assert(true);
      done();
    });
  });
});
