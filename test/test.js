var fs = require('fs');
var assert = require('assert');
var crypto = require('crypto');

var nxtpm = require('../index');
var config = nxtpm.config;
var init = nxtpm.init;
var nxt = nxtpm.nxt;
var package = nxtpm.package;

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
    package.compressDir(dir, outfile, false, function() {
      var hash = crypto.createHash('sha256');
      var stream = fs.createReadStream(outfile);
      stream.on('data', function(data) {
        hash.update(data, 'utf8');
      });
      stream.on('end', function() {
        checksum = hash.digest('hex');
        assert.strictEqual(
          checksum,
          'a68764d99625f1dc1495215d64a929f3253b0b25428b5c5b15d83822ca6a488c'
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

