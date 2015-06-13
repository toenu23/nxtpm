var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var Targz = require('tar.gz');
var Log = require('log');
var log = new Log();
var url = require('url');
var request = require('request');
var tmp = require('tmp');

var nxt = require('./nxt.js');
var config = require('./config.js');
var nxtConfig = config.load();

module.exports = function installPackage(alias, target, callback) {

  var aliasData;
  var packageInfo;
  var tmpFile;

  var checkAlias = function() {
    var query = {
      requestType: 'getAlias',
      aliasName: alias,
    };
    nxt.request(query, function(err, resp) {
      if (resp && isNaN(resp.aliasURI)) {
        err = new Error('Invalid alias data');
      }
      if (err) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      aliasData = resp.aliasURI;
      checkMessage();
    });
  };

  var checkMessage = function() {
    var query = {
      requestType: 'getTransaction',
      transaction: aliasData,
    };
    nxt.request(query, function(err, resp) {
      if (resp && (resp.recipientRS !== nxtConfig.publish.address)) {
        err = new Error('Transaction doesn\'t belong to publishing account');
      }
      if (resp && (!resp.attachment || !resp.attachment.message)) {
        err = new Error('Transaction has no message');
      }
      if (err) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      try {
        packageInfo = JSON.parse(resp.attachment.message);
      } catch (e) {
        if (callback) {
          callback(e);
        }
        log.error(e);
        return log.error(
          'Message is not valid JSON'
        );
      }
      checkPackage();
    });
  };

  var checkPackage = function() {
    var err;
    if (!packageInfo.alias || packageInfo.alias != alias) {
      err = new Error('Alias mismatch');
    }
    if (!packageInfo.url) {
      err = new Error('Package missing required field "url"');
    } else {
      var packageUrl = url.parse(packageInfo.url);
      if (!packageUrl) {
       err = new Error('Invalid URL');
      }
    }
    if (err) {
      if (callback) {
        callback(err);
      }
      return log.error(err);
    }
    downloadPackage();
  };

  var downloadPackage = function() {

    tmpFile = tmp.fileSync();
    var stream = fs.createWriteStream(tmpFile.name);
    var err;

    request
      .get(packageInfo.url)
      .on('response', function(resp) {
        log.info(
          'GET %s %s',
          packageInfo.url,
          resp.statusCode
        );
        if (resp.statusCode !== 200) {
          err = new Error('Received invalid response code');
        }
      })
      .on('error', function(error) {
        err = error;
      })
      .on('end', function() {
        if (err) {
          if (callback) {
            callback(err);
          }
          return log.error(err);
        }
        verifyPackage();
      })
      .pipe(stream);
  };

  var verifyPackage = function() {
    var hash = crypto.createHash('sha256');
    var stream = fs.createReadStream(tmpFile.name);
    stream.on('data', function(data) {
      hash.update(data, 'utf8');
    });
    stream.on('end', function() {
      var checksum = hash.digest('hex');
      if (checksum !== packageInfo.sha256) {
        var err = new Error('Couldn\'t verify package');
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      log.info('Verification passed.');
      log.info(
        'SHA256: %s',
        checksum
      );
      extractPackage();
    });
  };

  var extractPackage = function() {
    var compress = new Targz().extract(tmpFile.name, target, function(err) {
      if (err) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      var fullPath = path.resolve(target);
      log.info(
        'Package extracted to %s',
        fullPath
      );
      if (callback) {
        callback();
      }
    });
  };

  if (!target) {
    target = '.';
  }

  var dirExists = fs.existsSync(target);
  if (!dirExists) {
    var err = new Error('Path %s doesn\'t exist');
    if (callback) {
      callback(err);
    }
    return log.error(err);
  }
  checkAlias();
};

