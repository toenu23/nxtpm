var fs = require('fs');
var assert = require('assert');
var crypto = require('crypto');

global.NXTPM = {
  appName: 'nxtpm',
  account: 'NXT-PACK-JWE9-VGPZ-CZN9D',
};

var config = require('../lib/config.js');
var init = require('../lib/init.js');
var nxt = require('../lib/nxt.js');
var package = require('../lib/package.js');

describe('Config', function() {
  var confObj;
  it('should load the config object', function() {
    confObj = config.load();
    assert.equal(typeof confObj, 'object');
  });
});

describe('Init', function() {
  it('should write the package file', function(done) {
    var rand = Math.floor(Math.random() * 10000);
    var packageObj = {
      alias: 'test',
      name: rand,
    };
    var path = __dirname + '/tmp/package.json';
    init.writePackageFile(path, packageObj, function() {
      var result = require(path);
      assert.deepEqual(packageObj, result);
      done();
    });
  });
});

describe('Nxt', function() {
  it('should do an API request', function(done) {
    var query = {
      requestType: 'getConstants',
    };
    nxt.request(query, function(err, resp) {
      assert.strictEqual(resp.genesisAccountId, '1739068987193023818');
      done();
    });
  });
});

describe('Package', function() {
  it('should package a folder', function(done) {
    var dir = __dirname + '/testpkg';
    var outfile = __dirname + '/test.tgz';
    package.compressDir(dir, outfile, function() {
      var hash = crypto.createHash('sha256');
      var stream = fs.createReadStream(outfile);
      stream.on('data', function(data) {
        hash.update(data, 'utf8');
      });
      stream.on('end', function() {
        checksum = hash.digest('hex');
        assert.strictEqual(
          checksum,
          'bbdb29842043ab88456536d15f8ea34eee115e62678bda000e95442b07ec7c76'
        );
        fs.unlinkSync(outfile);
        done();
      });
    });
  });
});

describe('Install', function() {
  // TODO
});

describe('Publish', function() {
  // TODO
});

