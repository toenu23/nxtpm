var fs = require('fs');
var assert = require('assert');
var crypto = require('crypto');

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
          'e4fc4a72fb848f86601302e7c16d17e2d8b67d54009f1e9548fc38ff8a213f99'
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

